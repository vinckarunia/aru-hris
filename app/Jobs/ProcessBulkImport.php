<?php

namespace App\Jobs;

use App\Models\Assignment;
use App\Models\Contract;
use App\Models\ContractCompensation;
use App\Models\Department;
use App\Models\FamilyMember;
use App\Models\Project;
use App\Models\Worker;
use App\Services\ImportDataCleaner;
use App\Services\ImportService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Class ProcessBulkImport
 *
 * Background job that processes a validated CSV import session. Reads the CSV file
 * from storage, creates Worker, Assignment, Contract, ContractCompensation,
 * and FamilyMember records using per-row database transactions.
 *
 * Progress is tracked in Redis and polled by the frontend in real-time.
 * Failed rows are collected into a downloadable CSV with error reasons
 * so users can fix and re-import them through the same tool.
 *
 * @package App\Jobs
 */
class ProcessBulkImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public int $timeout = 600;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public int $tries = 1;

    /**
     * @var string The unique import session ID.
     */
    protected string $sessionId;

    /**
     * @var array<string, int> The column mapping (db_field => csv_column_index).
     */
    protected array $mapping;

    /**
     * @var array The global settings (project_id, department_id, rates, etc.).
     */
    protected array $globalSettings;

    /**
     * @var int The ID of the user who initiated the import.
     */
    protected int $userId;

    /**
     * @var array Per-row conflict actions: [row_number => 'update'|'skip'].
     */
    protected array $rowActions;

    /**
     * Create a new job instance.
     *
     * @param string $sessionId The unique import session ID.
     * @param array $mapping The column mapping from the frontend.
     * @param array $globalSettings Global settings (project_id, department_id, rates).
     * @param int $userId The ID of the authenticated user.
     * @param array $rowActions Per-row conflict actions: [row_number => 'update'|'skip'].
     */
    public function __construct(string $sessionId, array $mapping, array $globalSettings, int $userId, array $rowActions = [])
    {
        $this->sessionId = $sessionId;
        $this->mapping = $mapping;
        $this->globalSettings = $globalSettings;
        $this->userId = $userId;
        $this->rowActions = $rowActions;
        $this->onQueue('default');
    }

    /**
     * Execute the import job.
     *
     * Processes each CSV row in its own database transaction so that a failure
     * in one row does not affect others. Updates Redis progress after each row.
     * Generates a failed rows CSV at the end if any rows failed.
     *
     * @return void
     */
    public function handle(): void
    {
        $importService = app(ImportService::class);
        $cached = $importService->getCachedSession($this->sessionId);

        if (!$cached) {
            Log::error("ProcessBulkImport: Session not found in Redis for ID: {$this->sessionId}");
            $importService->updateProgress($this->sessionId, 0, 0, 0, 'failed');
            return;
        }

        $fullPath = Storage::disk('local')->path($cached['file_path']);
        if (!file_exists($fullPath)) {
            Log::error("ProcessBulkImport: File not found at {$fullPath}");
            $importService->updateProgress($this->sessionId, 0, 0, 0, 'failed');
            return;
        }

        $handle = fopen($fullPath, 'r');
        $headers = fgetcsv($handle);

        $failedRows = [];
        $failedHeaders = $headers;
        $failedHeaders[] = 'ERROR_REASON';

        $processed = 0;
        $failed = 0;
        $totalRows = $cached['total_rows'];

        while (($row = fgetcsv($handle)) !== false) {
            // Skip empty rows
            if (empty(array_filter($row))) {
                continue;
            }

            $processed++;
            $rowIdentifier = ImportDataCleaner::extractField($row, $this->mapping, 'name') ?? "Baris {$processed}";

            try {
                DB::beginTransaction();

                // 1. Create Worker
                $workerData = $importService->buildWorkerData($row, $this->mapping);

                // Validate required fields
                if (empty($workerData['name'])) {
                    throw new \Exception('Nama karyawan kosong.');
                }
                if (empty($workerData['ktp_number'])) {
                    throw new \Exception('Nomor KTP kosong.');
                }

                // Check for duplicate KTP — handle via row_actions
                $existingWorker = Worker::where('ktp_number', $workerData['ktp_number'])->first();
                $isUpdate = false;

                if ($existingWorker) {
                    $action = $this->rowActions[(string) $processed] ?? 'skip';
                    if ($action === 'update') {
                        $isUpdate = true;
                    } else {
                        // Skip this row silently (user chose to skip or no action specified)
                        DB::commit();
                        $importService->updateProgress($this->sessionId, $processed, $totalRows, $failed, 'processing');
                        continue;
                    }
                }

                if ($isUpdate) {
                    // Update existing worker data (only non-null fields from CSV)
                    $updateData = array_filter($workerData, fn($v) => $v !== null && $v !== '');
                    unset($updateData['ktp_number']); // Don't update the KTP itself
                    $existingWorker->update($updateData);
                    $worker = $existingWorker;
                } else {
                    $worker = Worker::create($workerData);
                }

                // 1.5 Pre-process Project and Department Auto-Creation
                $projectName = ImportDataCleaner::extractField($row, $this->mapping, 'project_name');
                $projectToBind = null;
                if ($projectName && !empty($this->globalSettings['client_id'])) {
                    $existingProject = Project::where('name', 'ilike', trim($projectName))->first();
                    if (!$existingProject) {
                        $existingProject = Project::create([
                            'client_id' => $this->globalSettings['client_id'],
                            'name' => trim($projectName),
                            'prefix' => strtoupper(substr(trim($projectName), 0, 3)),
                            'id_running_number' => 0
                        ]);
                    }
                    $this->globalSettings['project_id'] = $existingProject->id;
                    $projectToBind = $existingProject;
                }

                $deptName = ImportDataCleaner::extractField($row, $this->mapping, 'department_name');
                if ($deptName && !empty($this->globalSettings['client_id'])) {
                    $query = Department::where('name', 'ilike', trim($deptName));
                    if ($projectToBind) {
                        $query->where('client_id', $projectToBind->client_id);
                    }
                    $existingDept = $query->first();

                    if (!$existingDept) {
                        $existingDept = Department::create([
                            'client_id' => $this->globalSettings['client_id'],
                            'name' => trim($deptName)
                        ]);
                    }
                    $this->globalSettings['department_id'] = $existingDept->id;

                    if ($projectToBind) {
                        $projectToBind->departments()->syncWithoutDetaching([$existingDept->id]);
                    } elseif (!empty($this->globalSettings['project_id'])) {
                        $p = Project::find($this->globalSettings['project_id']);
                        if ($p) {
                            $p->departments()->syncWithoutDetaching([$existingDept->id]);
                        }
                    }
                }

                // 2. Create or update Assignment
                $assignmentData = $importService->buildAssignmentData($row, $this->mapping, $this->globalSettings);
                if ($isUpdate) {
                    // Update existing assignment if exists, otherwise create new
                    $existingAssignment = Assignment::where('worker_id', $worker->id)->first();
                    if ($existingAssignment) {
                        $existingAssignment->update($assignmentData);
                        $assignment = $existingAssignment;
                    } else {
                        $assignmentData['worker_id'] = $worker->id;
                        $assignment = Assignment::create($assignmentData);
                    }
                } else {
                    $assignmentData['worker_id'] = $worker->id;
                    $assignment = Assignment::create($assignmentData);
                }

                // Auto-generate NIK ARU — always fresh per assignment (reflects the active project).
                $this->generateNikAru($worker, $assignment);

                // 4. Create Contracts (PKWT 1-8, PKWTT)
                $contractsData = $importService->buildContractsData($row, $this->mapping, $this->globalSettings);
                $latestContractId = null;
                $latestEndDate = null;

                foreach ($contractsData as $contractData) {
                    $contractData['assignment_id'] = $assignment->id;
                    $contract = Contract::create($contractData);

                    // Track the latest contract for compensation attachment
                    $endDate = $contractData['end_date'];
                    if ($contractData['pkwt_type'] === 'PKWTT') {
                        // PKWTT is always the latest
                        $latestContractId = $contract->id;
                        $latestEndDate = null;
                    } elseif (
                        is_null($latestEndDate) ||
                        ($endDate && Carbon::parse($endDate)->gt(Carbon::parse($latestEndDate)))
                    ) {
                        $latestEndDate = $endDate;
                        $latestContractId = $contract->id;
                    }
                }

                // 5. Attach Compensation to the latest contract
                if ($latestContractId) {
                    $compData = $importService->buildCompensationData($row, $this->mapping, $this->globalSettings);
                    $compData['contract_id'] = $latestContractId;
                    ContractCompensation::create($compData);
                }

                // 6. Create Family Members
                $familyData = $importService->buildFamilyMembersData($row, $this->mapping);
                foreach ($familyData as $memberData) {
                    $memberData['worker_id'] = $worker->id;
                    FamilyMember::create($memberData);
                }

                DB::commit();

            } catch (\Exception $e) {
                DB::rollBack();
                $failed++;

                $failedRow = $row;
                $failedRow[] = $e->getMessage() . " [{$rowIdentifier}]";
                $failedRows[] = $failedRow;

                Log::warning("ProcessBulkImport: Row {$processed} failed - {$e->getMessage()}");
            }

            // Update progress in Redis
            $importService->updateProgress($this->sessionId, $processed, $totalRows, $failed, 'processing');
        }

        fclose($handle);

        // Generate failed rows CSV if any
        $failedFilePath = null;
        if (count($failedRows) > 0) {
            $failedFilePath = $this->generateFailedCsv($failedHeaders, $failedRows);
        }

        // Mark as completed
        $importService->updateProgress($this->sessionId, $processed, $totalRows, $failed, 'completed', $failedFilePath);

        // Clean up uploaded file
        Storage::disk('local')->delete($cached['file_path']);

        Log::info("ProcessBulkImport: Completed. Processed={$processed}, Failed={$failed}, SessionId={$this->sessionId}");
    }

    /**
     * Auto-generate NIK ARU for a worker based on their assignment's project.
     *
     * Will skip generation if the worker already has an imported NIK ARU.
     * Format: {PREFIX}{PADDED_NUMBER} (e.g., "ARU001").
     *
     * @param  Worker     $worker     The worker model.
     * @param  Assignment $assignment The assignment model.
     * @return void
     */
    private function generateNikAru(Worker $worker, Assignment $assignment): void
    {
        // Skip if NIK ARU was already provided during import
        if (!empty($worker->nik_aru)) {
            return;
        }

        $project = Project::find($assignment->project_id);
        if (!$project) {
            return;
        }

        $prefix = (string) $project->prefix;

        $maxWorkerNikNumber = \App\Models\Worker::whereNotNull('nik_aru')
            ->where('nik_aru', 'like', $prefix . '%')
            ->pluck('nik_aru')
            ->map(function ($nik) use ($prefix) {
                // Extract only the numeric part after the prefix
                $numberPart = substr($nik, strlen($prefix));
                return is_numeric($numberPart) ? (int) $numberPart : 0;
            })
            ->max() ?? 0;

        $currentMax = max((int) $project->id_running_number, $maxWorkerNikNumber);
        $nextNumber = $currentMax + 1;

        $project->update(['id_running_number' => $nextNumber]);

        $paddedNumber = str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
        $newNik       = "{$prefix}{$paddedNumber}";

        $worker->update(['nik_aru' => $newNik]);
    }

    /**
     * Generate a CSV file containing rows that failed during import.
     *
     * The output CSV includes all original columns plus an ERROR_REASON column,
     * allowing users to review, fix, and re-import through the same tool.
     *
     * @param array $headers The header row including ERROR_REASON.
     * @param array $failedRows The failed row data.
     * @return string The storage path of the failed CSV file.
     */
    private function generateFailedCsv(array $headers, array $failedRows): string
    {
        $fileName = 'failed_imports/failed_import_' . $this->sessionId . '.csv';
        $content = fopen('php://temp', 'r+');

        fputcsv($content, $headers);
        foreach ($failedRows as $row) {
            fputcsv($content, $row);
        }

        rewind($content);
        Storage::disk('local')->put($fileName, stream_get_contents($content));
        fclose($content);

        return $fileName;
    }

    /**
     * Handle a job failure.
     *
     * @param \Throwable $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("ProcessBulkImport: Job failed - {$exception->getMessage()}", [
            'session_id' => $this->sessionId,
            'exception' => $exception,
        ]);

        $importService = app(ImportService::class);
        $importService->updateProgress($this->sessionId, 0, 0, 0, 'failed');
    }
}