<?php

namespace App\Jobs;

use App\Models\Assignment;
use App\Models\Contract;
use App\Models\ContractCompensation;
use App\Models\FamilyMember;
use App\Models\Project;
use App\Models\Department;
use App\Models\Worker;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * Class ProcessBulkImport
 *
 * Background job to parse CSV, clean data, insert into relational databases, 
 * and generate a failed rows CSV if necessary.
 */
class ProcessBulkImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @var string
     */
    protected $filePath;

    /**
     * @var array
     */
    protected $mapping;

    /**
     * @var int
     */
    protected $userId;

    /**
     * @var int
     */
    protected $defaultProjectId;

    /**
     * Create a new job instance.
     *
     * @param string $filePath The storage path of the uploaded CSV.
     * @param array $mapping The column mapping from the frontend.
     * @param int $userId The ID of the user initiating the import.
     * @param int $defaultProjectId The default project ID for assignments (if needed).
     */
    public function __construct(string $filePath, array $mapping, int $userId, int $defaultProjectId = 1)
    {
        $this->filePath = $filePath;
        $this->mapping = $mapping;
        $this->userId = $userId;
        $this->defaultProjectId = $defaultProjectId;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        $fullPath = Storage::disk('local')->path($this->filePath);
        if (!file_exists($fullPath)) {
            Log::error("Import failed: File not found at {$fullPath}");
            return;
        }

        $fileHandle = fopen($fullPath, 'r');
        $headers = fgetcsv($fileHandle); // Skip header row

        $failedRows = [];
        $failedHeaders = $headers;
        $failedHeaders[] = 'ERROR_REASON';
        $failedRows[] = $failedHeaders;

        // Ensure default department exists for assignments
        $defaultDept = Department::firstOrCreate(
            ['project_id' => $this->defaultProjectId, 'name' => 'General'],
            ['name' => 'General']
        );

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($fileHandle)) !== false) {
                // Skip completely empty rows
                if (empty(array_filter($row))) continue;

                try {
                    $ktpNumber = $this->extractMappedData($row, 'ktp_number');
                    $name = $this->extractMappedData($row, 'name');
                    
                    // 1. Validate mandatory fields
                    if (empty($ktpNumber)) {
                        throw new \Exception("KTP Number is empty.");
                    }

                    if (Worker::where('ktp_number', $ktpNumber)->exists()) {
                        throw new \Exception("Duplicate KTP Number. Worker already exists.");
                    }

                    // 2. Create Worker
                    $worker = Worker::create([
                        'nik_aru'               => $this->extractMappedData($row, 'nik_aru'),
                        'name'                  => $name,
                        'ktp_number'            => $ktpNumber,
                        'kk_number'             => $this->extractMappedData($row, 'kk_number'),
                        'birth_place'           => $this->extractMappedData($row, 'birth_place'),
                        'birth_date'            => $this->parseDateString($this->extractMappedData($row, 'birth_date')),
                        'gender'                => strtolower($this->extractMappedData($row, 'gender')) == 'l' ? 'male' : 'female',
                        'phone'                 => $this->extractMappedData($row, 'phone'),
                        'education'             => $this->extractMappedData($row, 'education'),
                        'religion'              => $this->extractMappedData($row, 'religion'),
                        'tax_status'            => $this->extractMappedData($row, 'tax_status'),
                        'address_ktp'           => $this->extractMappedData($row, 'address_ktp'),
                        'address_domicile'      => $this->extractMappedData($row, 'address_domicile'),
                        'mother_name'           => $this->extractMappedData($row, 'mother_name'),
                        'npwp'                  => $this->extractMappedData($row, 'npwp'),
                        'bpjs_kesehatan'        => $this->extractMappedData($row, 'bpjs_kesehatan'),
                        'bpjs_ketenagakerjaan'  => $this->extractMappedData($row, 'bpjs_ketenagakerjaan'),
                        'bank_name'             => $this->extractMappedData($row, 'bank_name'),
                        'bank_account_number'   => $this->extractMappedData($row, 'bank_account_number'),
                    ]);

                    // 3. Create Assignment
                    $terminationReasonRaw = strtolower($this->extractMappedData($row, 'termination_reason') ?? '');
                    $parsedTermination = $this->parseTerminationStatus($terminationReasonRaw);

                    $assignment = Assignment::create([
                        'worker_id'          => $worker->id,
                        'project_id'         => $this->defaultProjectId,
                        'department_id'      => $defaultDept->id,
                        'employee_id'        => $this->extractMappedData($row, 'nik_tlj'),
                        'position'           => $this->extractMappedData($row, 'position'),
                        'hire_date'          => $this->parseDateString($this->extractMappedData($row, 'hire_date')) ?? Carbon::now()->format('Y-m-d'),
                        'termination_date'   => $parsedTermination['date'],
                        'termination_reason' => $parsedTermination['reason'],
                    ]);

                    // 4. Process Contracts (Horizontal to Vertical)
                    $latestContractId = null;
                    $latestEndDate = null;

                    // Loop for PKWT 1 to 8
                    for ($i = 1; $i <= 8; $i++) {
                        $start = $this->parseDateString($this->extractMappedData($row, "pkwt_{$i}_start"));
                        $end = $this->parseDateString($this->extractMappedData($row, "pkwt_{$i}_end"));

                        if ($start) {
                            $contract = Contract::create([
                                'assignment_id'   => $assignment->id,
                                'contract_type'   => 'PKWT',
                                'contract_number' => $i,
                                'start_date'      => $start,
                                'end_date'        => $end,
                            ]);

                            // Track the latest contract
                            if (is_null($latestEndDate) || ($end && Carbon::parse($end)->gt(Carbon::parse($latestEndDate)))) {
                                $latestEndDate = $end;
                                $latestContractId = $contract->id;
                            }
                        }
                    }

                    // Check for PKWTT (Permanent)
                    $pkwttStart = $this->parseDateString($this->extractMappedData($row, 'pkwtt_start'));
                    if ($pkwttStart) {
                        $contract = Contract::create([
                            'assignment_id'   => $assignment->id,
                            'contract_type'   => 'PKWTT',
                            'contract_number' => 99, // Indicate special number or leave null based on your logic
                            'start_date'      => $pkwttStart,
                            'end_date'        => null,
                        ]);
                        $latestContractId = $contract->id; // PKWTT is always the ultimate latest
                    }

                    // 5. Attach Compensation to the Latest Contract
                    if ($latestContractId) {
                        ContractCompensation::create([
                            'contract_id'             => $latestContractId,
                            'base_salary'             => $this->cleanCurrencyString($this->extractMappedData($row, 'base_salary')),
                            'salary_rate'             => 'monthly', // Can be dynamic based on your frontend mapping
                            'meal_allowance'          => $this->cleanCurrencyString($this->extractMappedData($row, 'meal_allowance')),
                            'transport_allowance'     => $this->cleanCurrencyString($this->extractMappedData($row, 'transport_allowance')),
                            'overtime_weekday_rate'   => $this->cleanCurrencyString($this->extractMappedData($row, 'overtime_weekday')),
                            'overtime_holiday_rate'   => $this->cleanCurrencyString($this->extractMappedData($row, 'overtime_holiday')),
                            'overtime_rate'           => 'hourly',
                        ]);
                    }

                    // 6. Process Family Members (Horizontal to Vertical)
                    $this->insertFamilyMember($worker->id, $row, 'spouse', 'spouse');
                    $this->insertFamilyMember($worker->id, $row, 'child_1', 'child');
                    $this->insertFamilyMember($worker->id, $row, 'child_2', 'child');
                    $this->insertFamilyMember($worker->id, $row, 'child_3', 'child');

                } catch (\Exception $e) {
                    $failedRow = $row;
                    $failedRow[] = $e->getMessage();
                    $failedRows[] = $failedRow;
                }
            }
            
            DB::commit();
            Log::info("Import job completed successfully.");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Critical error during import: " . $e->getMessage());
        } finally {
            fclose($fileHandle);
            
            if (count($failedRows) > 1) {
                $this->generateFailedDump($failedRows);
            }

            Storage::disk('local')->delete($this->filePath);
        }
    }

    /**
     * Safely extract data from the CSV row using the provided mapping.
     *
     * @param array $row The current CSV row data.
     * @param string $field The logical field name from mapping.
     * @return string|null
     */
    private function extractMappedData(array $row, string $field): ?string
    {
        if (isset($this->mapping[$field]) && isset($row[$this->mapping[$field]])) {
            $val = trim($row[$this->mapping[$field]]);
            return $val === '' ? null : $val;
        }
        return null;
    }

    /**
     * Clean currency string (e.g., " Rp 10.000 / Jam " -> 10000).
     *
     * @param string|null $value
     * @return float
     */
    private function cleanCurrencyString(?string $value): float
    {
        if (!$value || $value === '-') return 0.0;
        
        // Remove everything except numbers (and optionally decimal points if needed)
        $cleanString = preg_replace('/[^0-9]/', '', $value);
        return (float) ($cleanString ?: 0);
    }

    /**
     * Parse various dirty date formats into standard Y-m-d.
     * Handles "01/06/2019", "01 Juni 2019", etc.
     *
     * @param string|null $dateString
     * @return string|null
     */
    private function parseDateString(?string $dateString): ?string
    {
        if (!$dateString || $dateString === '-') return null;

        // Clean string from trailing/leading spaces
        $dateString = trim($dateString);

        // Convert Indonesian months to English so Carbon can read it
        $idMonths = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
        $enMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        $dateString = str_ireplace($idMonths, $enMonths, $dateString);
        
        // Handle slashes to dashes for standardized parsing
        $dateString = str_replace('/', '-', $dateString);

        try {
            return Carbon::parse($dateString)->format('Y-m-d');
        } catch (\Exception $e) {
            // Log if there's a specific unparseable date format
            Log::warning("Failed to parse date: {$dateString}");
            return null;
        }
    }

    /**
     * Parse termination text like "Resign (30/9/2021)" or "Habis Kontrak"
     * * @param string $statusString
     * @return array ['reason' => string|null, 'date' => string|null]
     */
    private function parseTerminationStatus(string $statusString): array
    {
        $result = ['reason' => null, 'date' => null];
        if (!$statusString || str_contains($statusString, 'aktif')) return $result;

        if (str_contains($statusString, 'resign')) $result['reason'] = 'resign';
        elseif (str_contains($statusString, 'habis kontrak')) $result['reason'] = 'contract expired';
        elseif (str_contains($statusString, 'diberhentikan')) $result['reason'] = 'fired';
        else $result['reason'] = 'other';

        // Extract date inside parentheses (e.g., "Resign (30/10/2023)")
        preg_match('/\((.*?)\)/', $statusString, $matches);
        if (isset($matches[1])) {
            $result['date'] = $this->parseDateString($matches[1]);
        }

        return $result;
    }

    /**
     * Helper to insert family member if name exists.
     *
     * @param int $workerId
     * @param array $row
     * @param string $prefix
     * @param string $relationshipType
     * @return void
     */
    private function insertFamilyMember(int $workerId, array $row, string $prefix, string $relationshipType): void
    {
        $name = $this->extractMappedData($row, "{$prefix}_name");
        
        if ($name) {
            FamilyMember::create([
                'worker_id'         => $workerId,
                'relationship_type' => $relationshipType,
                'name'              => $name,
                'birth_place'       => $this->extractMappedData($row, "{$prefix}_birth_place"),
                'birth_date'        => $this->parseDateString($this->extractMappedData($row, "{$prefix}_birth_date")),
                'nik'               => $this->extractMappedData($row, "{$prefix}_nik"),
                'bpjs_number'       => $this->extractMappedData($row, "{$prefix}_bpjs"),
            ]);
        }
    }

    /**
     * Generate a CSV file containing rows that failed to import.
     *
     * @param array $failedRows
     * @return void
     */
    private function generateFailedDump(array $failedRows): void
    {
        $fileName = 'failed_imports/failed_import_' . time() . '.csv';
        $fileContent = fopen('php://temp', 'r+');
        
        foreach ($failedRows as $row) {
            fputcsv($fileContent, $row);
        }
        
        rewind($fileContent);
        Storage::disk('local')->put($fileName, stream_get_contents($fileContent));
        fclose($fileContent);

        // Optional: Dispatch an event or notification to the user here
    }
}