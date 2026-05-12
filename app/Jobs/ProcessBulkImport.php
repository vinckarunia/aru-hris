<?php

namespace App\Jobs;

use App\Models\Assignment;
use App\Models\Contract;
use App\Models\ContractCompensation;
use App\Models\Branch;
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
 * Background job that processes a validated import session. Reads the file
 * from storage, creates Worker, Assignment, Contract, ContractCompensation,
 * and FamilyMember records using per-row database transactions.
 *
 * Progress is tracked in Redis and polled by the frontend in real-time.
 * Failed rows are collected into a downloadable with error reasons
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
     * @var array The global settings (project_id, branch_id, rates, etc.).
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
     * @var int The 1-indexed row number containing headers.
     */
    protected int $headerRow;

    /**
     * @var string|null When set, only rows from this sheet will be processed.
     */
    protected ?string $activeSheetName;

    /**
     * Create a new job instance.
     *
     * @param string $sessionId The unique import session ID.
     * @param array $mapping The column mapping from the frontend.
     * @param array $globalSettings Global settings (project_id, branch_id, rates).
     * @param int $userId The ID of the authenticated user.
     * @param array $rowActions Per-row conflict actions: [row_number => 'update'|'skip'].
     * @param int $headerRow The 1-indexed row number containing headers.
     * @param string|null $activeSheetName When set, only rows from this sheet will be processed.
     */
    public function __construct(string $sessionId, array $mapping, array $globalSettings, int $userId, array $rowActions = [], int $headerRow = 1, ?string $activeSheetName = null)
    {
        $this->sessionId = $sessionId;
        $this->mapping = $mapping;
        $this->globalSettings = $globalSettings;
        $this->userId = $userId;
        $this->rowActions = $rowActions;
        $this->headerRow = $headerRow;
        $this->activeSheetName = $activeSheetName;
        $this->onQueue('default');
    }

    /**
     * Execute the import job.
     *
     * Processes each row in its own database transaction so that a failure
     * in one row does not affect others. Updates Redis progress after each row.
     * Generates a failed rows at the end if any rows failed.
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

        $extension = pathinfo($fullPath, PATHINFO_EXTENSION);
        $headers = [];
        $rowsData = [];

        if (strtolower($extension) === 'csv') {
            $handle = fopen($fullPath, 'r');

            // Skip rows up to and including the header row
            for ($s = 0; $s < $this->headerRow; $s++) {
                $headerLine = fgetcsv($handle);
                if ($s === $this->headerRow - 1) {
                    $headers = $headerLine;
                }
            }

            while (($row = fgetcsv($handle)) !== false) {
                if (!empty(array_filter($row))) {
                    $rowsData[] = $row;
                }
            }
            fclose($handle);
        } else {
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($fullPath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($fullPath);
            foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                // Skip sheets not matching the active sheet filter
                if ($this->activeSheetName !== null && $worksheet->getTitle() !== $this->activeSheetName) {
                    continue;
                }
                $rows = $worksheet->toArray();
                if (empty($rows)) {
                    continue;
                }
                if (empty($headers) && isset($rows[$this->headerRow - 1])) {
                    $headers = $rows[$this->headerRow - 1];
                }
                for ($i = $this->headerRow; $i < count($rows); $i++) {
                    $row = $rows[$i];
                    if (!empty(array_filter($row))) {
                        $rowsData[] = $row;
                    }
                }
            }
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }

        $failedRows = [];
        $failedHeaders = $headers ?: [];
        $failedHeaders[] = 'ERROR_REASON';

        $processed = 0;
        $failed = 0;
        $totalRows = $cached['total_rows'];

        // Track KTP numbers seen in this batch for duplicate detection (mirrors validateAllRows logic)
        $seenKtpNumbers = [];

        foreach ($rowsData as $row) {

            $processed++;
            $rowIdentifier = ImportDataCleaner::extractField($row, $this->mapping, 'name') ?? "Baris {$processed}";

            // ---------------------------------------------------------------
            // Pre-validation: run the same rules used in the preview step.
            // Rows that fail validation are written to the failed without
            // ever touching the database, so they can be corrected and re-imported.
            // ---------------------------------------------------------------
            $preValidation = $importService->validateSingleRow($row, $this->mapping, $this->globalSettings, $seenKtpNumbers);
            if (count($preValidation['errors']) > 0) {
                $failed++;
                $reason = implode('; ', $preValidation['errors']);
                $failedRow   = $row;
                $failedRow[] = $reason;
                $failedRows[] = $failedRow;

                Log::warning("ProcessBulkImport: Row {$processed} failed pre-validation - {$reason}");
                $importService->updateProgress($this->sessionId, $processed, $totalRows, $failed, 'processing');
                continue;
            }

            try {
                DB::beginTransaction();

                // 1. Build Worker data
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

                // 1.5 Pre-process Project and Department Auto-Creation
                $projectName = ImportDataCleaner::extractField($row, $this->mapping, 'project_name');
                $projectToBind = null;
                if (isset($this->globalSettings['client_id']) && isset($this->globalSettings['branch_ids']) && count($this->globalSettings['branch_ids']) > 0) {
                    // Coba cari project dari salah satu branch_id pertama (hanya untuk fallback logic yang sama)
                    $firstBranchId = $this->globalSettings['branch_ids'][0];
                    $existingBranch = \App\Models\Branch::where('client_id', $this->globalSettings['client_id'])
                        ->where('id', $firstBranchId)
                        ->first();
                    if ($existingBranch) {
                        $this->globalSettings['branch_ids'] = [$existingBranch->id];
                    }
                }
                if ($projectName && !empty($this->globalSettings['client_id'])) {
                    $existingProject = Project::where('name', 'like', trim($projectName))
                        ->where('client_id', $this->globalSettings['client_id'])
                        ->first();
                    if (!$existingProject) {
                        // Generate a unique prefix from the project name
                        $basePrefix = strtoupper(substr(trim($projectName), 0, 3));
                        if (strlen($basePrefix) < 2) {
                            $basePrefix = 'ARU';
                        }
                        $prefix = $basePrefix;
                        $suffix = 1;
                        while (Project::where('prefix', $prefix)->exists()) {
                            $prefix = $basePrefix . $suffix;
                            $suffix++;
                        }

                        $existingProject = Project::create([
                            'client_id' => $this->globalSettings['client_id'],
                            'name' => trim($projectName),
                            'prefix' => $prefix,
                            'id_running_number' => 0
                        ]);
                    }
                    $this->globalSettings['project_id'] = $existingProject->id;
                    $projectToBind = $existingProject;
                }

                $branchName = ImportDataCleaner::extractField($row, $this->mapping, 'branch_name');
                if ($branchName && !empty($this->globalSettings['client_id'])) {
                    $query = Branch::where('name', 'like', trim($branchName));
                    if ($projectToBind) {
                        $query->where('client_id', $projectToBind->client_id);
                    } else {
                        $query->where('client_id', $this->globalSettings['client_id']);
                    }
                    $existingBranch = $query->first();

                    if (!$existingBranch) {
                        $existingBranch = Branch::create([
                            'client_id' => $this->globalSettings['client_id'],
                            'name'      => trim($branchName)
                        ]);
                    }
                    $this->globalSettings['branch_ids'] = [$existingBranch->id];

                    if ($projectToBind) {
                        $projectToBind->branches()->syncWithoutDetaching([$existingBranch->id]);
                    } elseif (!empty($this->globalSettings['project_id'])) {
                        $p = Project::find($this->globalSettings['project_id']);
                        if ($p) {
                            $p->branches()->syncWithoutDetaching([$existingBranch->id]);
                        }
                    }
                }

                // --- PIC Interception: create DataRequest INSTEAD of writing to DB ---
                $user = \App\Models\User::find($this->userId);
                $isPic = $user && $user->isPic();

                if ($isPic) {
                    $assignmentData = $importService->buildAssignmentData($row, $this->mapping, $this->globalSettings);
                    $contractsData = $importService->buildContractsData($row, $this->mapping, $this->globalSettings);
                    $compData = $importService->buildCompensationData($row, $this->mapping, $this->globalSettings);
                    $familyData = $importService->buildFamilyMembersData($row, $this->mapping);

                    $payload = array_merge($workerData, $assignmentData, [
                        'contracts' => $contractsData,
                        'compensation' => $compData,
                        'family_members' => $familyData
                    ]);

                    if ($isUpdate) {
                        $payload['_action'] = 'bulk_import_update_worker';
                    }

                    \App\Models\DataRequest::create([
                        'worker_id' => $isUpdate ? $existingWorker->id : null,
                        'project_id' => $assignmentData['project_id'] ?? $this->globalSettings['project_id'],
                        'requested_by' => $this->userId,
                        'request_type' => $isUpdate ? 'data_change' : 'new_data',
                        'requested_fields' => array_keys($payload),
                        'requested_data' => $payload,
                        'notes' => $isUpdate ? 'Update Karyawan via Bulk Import' : 'Import Karyawan via Bulk Upload',
                        'status' => 'pending',
                        'pic_status' => 'approved',
                        'pic_reviewed_by' => $this->userId,
                        'pic_reviewed_at' => now(),
                    ]);

                    DB::commit();
                    $importService->updateProgress($this->sessionId, $processed, $totalRows, $failed, 'processing');
                    continue;
                }

                // --- Admin path: create records directly ---
                if ($isUpdate) {
                    // Update existing worker data (only non-null fields from CSV)
                    $updateData = array_filter($workerData, fn($v) => $v !== null && $v !== '');
                    unset($updateData['ktp_number']); // Don't update the KTP itself
                    $existingWorker->update($updateData);
                    $worker = $existingWorker;
                } else {
                    $worker = Worker::create($workerData);
                }

                // 2. Create or update Assignment
                $assignmentData = $importService->buildAssignmentData($row, $this->mapping, $this->globalSettings);
                // branch_id is no longer in assignment table, handled via branches()
                unset($assignmentData['branch_id']);
                
                if ($isUpdate) {
                    // Update existing assignment if exists, otherwise create new
                    $existingAssignment = Assignment::where('worker_id', $worker->id)->first();
                    if ($existingAssignment) {
                        $assignmentUpdateData = array_filter($assignmentData, fn($v) => $v !== null && $v !== '');
                        $existingAssignment->update($assignmentUpdateData);
                        $assignment = $existingAssignment;
                    } else {
                        $assignmentData['worker_id'] = $worker->id;
                        $assignment = Assignment::create($assignmentData);
                    }
                } else {
                    $assignmentData['worker_id'] = $worker->id;
                    $assignment = Assignment::create($assignmentData);
                }

                if (!empty($this->globalSettings['branch_ids'])) {
                    $assignment->branches()->sync($this->globalSettings['branch_ids']);
                }

                // Auto-generate NIK ARU — always fresh per assignment (reflects the active project).
                $this->generateNikAru($worker, $assignment);

                // 4. Create Contracts (PKWT 1-8, PKWTT)
                $contractsData = $importService->buildContractsData($row, $this->mapping, $this->globalSettings);
                $latestContractId = null;
                $latestEndDate = null;

                foreach ($contractsData as $contractData) {
                    $contractData['assignment_id'] = $assignment->id;
                    
                    if ($isUpdate) {
                        $contractUpdateData = array_filter($contractData, fn($v) => $v !== null && $v !== '');
                        $contract = Contract::updateOrCreate(
                            [
                                'assignment_id' => $assignment->id,
                                'contract_type' => $contractData['contract_type'] ?? 'Kontrak',
                                'pkwt_type' => $contractData['pkwt_type'] ?? null,
                                'pkwt_number' => $contractData['pkwt_number'] ?? null,
                            ],
                            $contractUpdateData
                        );
                    } else {
                        $contract = Contract::create($contractData);
                    }

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
                    
                    if ($isUpdate) {
                        $compUpdateData = array_filter($compData, fn($v) => $v !== null && $v !== '');
                        ContractCompensation::updateOrCreate(
                            ['contract_id' => $latestContractId],
                            $compUpdateData
                        );
                    } else {
                        ContractCompensation::create($compData);
                    }
                }

                // 6. Create Family Members
                $familyData = $importService->buildFamilyMembersData($row, $this->mapping);
                foreach ($familyData as $memberData) {
                    $memberData['worker_id'] = $worker->id;
                    FamilyMember::create($memberData);
                }

                DB::commit();

            } catch (\Throwable $e) {
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

        // Generate failed rows if any
        $failedFilePath = null;
        if (count($failedRows) > 0) {
            $failedFilePath = $this->generateFailedXlsx($failedHeaders, $failedRows);
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
     * Generate a file containing rows that failed during import in XLSX format.
     *
     * @param array $headers The header row including ERROR_REASON.
     * @param array $failedRows The failed row data.
     * @return string The storage path of the failed file.
     */
    private function generateFailedXlsx(array $headers, array $failedRows): string
    {
        $fileName = 'failed_imports/failed_import_' . $this->sessionId . '.xlsx';
        $fullPath = Storage::disk('local')->path($fileName);

        if (!Storage::disk('local')->exists('failed_imports')) {
            Storage::disk('local')->makeDirectory('failed_imports');
        }

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Write headers
        foreach ($headers as $index => $header) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue($colLetter . '1', $header);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }
        
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFEFEFEF'],
            ],
        ];
        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle('A1:' . $lastCol . '1')->applyFromArray($headerStyle);
        $sheet->freezePane('A2');

        // Write data
        $rowNum = 2;
        foreach ($failedRows as $rowData) {
            foreach ($rowData as $colIndex => $value) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1);
                $sheet->setCellValueExplicit($colLetter . $rowNum, $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            }
            $rowNum++;
        }

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($fullPath);

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