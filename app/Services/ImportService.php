<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Contract;
use App\Models\ContractCompensation;
use App\Models\Branch;
use App\Models\FamilyMember;
use App\Models\Project;
use App\Models\Worker;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Class ImportService
 *
 * Core service for the CSV Import Supertool. Handles file parsing, caching to Redis,
 * per-module validation, data building for each entity, and progress tracking.
 *
 * The service orchestrates data flow from raw CSV → cleaned data → validated entities,
 * mirroring the validation rules used by the individual module controllers.
 *
 * @package App\Services
 */
class ImportService
{
    /**
     * Redis key prefix for import sessions.
     */
    private const REDIS_PREFIX = 'import:';

    /**
     * TTL for cached import data in Redis (1 hour).
     */
    private const CACHE_TTL = 3600;

    /**
     * Maximum number of preview rows returned after upload.
     */
    private const PREVIEW_ROW_COUNT = 5;

    /**
     * All mappable database fields grouped by module.
     * Used for auto-mapping and template generation.
     *
     * @var array<int, array{group: string, options: array<int, array{key: string, label: string}>}>
     */
    public const DB_COLUMNS = [
        [
            'group' => 'Data Karyawan (Utama)',
            'options' => [
                ['key' => 'ktp_number', 'label' => 'NIK KTP (Wajib)'],
                ['key' => 'name', 'label' => 'Nama Lengkap (Wajib)'],
                ['key' => 'nik_aru', 'label' => 'NIK ARU'],
                ['key' => 'gender', 'label' => 'Jenis Kelamin (L/P)'],
                ['key' => 'birth_place', 'label' => 'Tempat Lahir'],
                ['key' => 'birth_date', 'label' => 'Tanggal Lahir'],
                ['key' => 'phone', 'label' => 'No Handphone'],
                ['key' => 'education', 'label' => 'Pendidikan Terakhir'],
                ['key' => 'religion', 'label' => 'Agama'],
                ['key' => 'tax_status', 'label' => 'Status Pajak/Tanggungan (PTKP)'],
            ],
        ],
        [
            'group' => 'Data Karyawan (Alamat & Dokumen)',
            'options' => [
                ['key' => 'address_ktp', 'label' => 'Alamat Sesuai KTP'],
                ['key' => 'address_domicile', 'label' => 'Alamat Sesuai Domisili'],
                ['key' => 'kk_number', 'label' => 'No Kartu Keluarga'],
                ['key' => 'mother_name', 'label' => 'Nama Ibu Kandung'],
                ['key' => 'npwp', 'label' => 'Nomor NPWP'],
                ['key' => 'bpjs_kesehatan', 'label' => 'No BPJS Kesehatan'],
                ['key' => 'bpjs_ketenagakerjaan', 'label' => 'No BPJS Ketenagakerjaan'],
                ['key' => 'bank_name', 'label' => 'Nama Bank'],
                ['key' => 'bank_account_number', 'label' => 'Nomor Rekening'],
            ],
        ],
        [
            'group' => 'Data Penempatan',
            'options' => [
                ['key' => 'project_name', 'label' => 'Nama Project'],
                ['key' => 'branch_name', 'label' => 'Nama Cabang'],
                ['key' => 'nik_tlj', 'label' => 'NIK Client (Employee ID)'],
                ['key' => 'position', 'label' => 'Jabatan (Position)'],
                ['key' => 'hire_date', 'label' => 'Tanggal Masuk (Hire Date)'],
                ['key' => 'status', 'label' => 'Status Karyawan'],
                ['key' => 'termination_date', 'label' => 'Tanggal Keluar'],
            ],
        ],
        [
            'group' => 'Data Kontrak (PKWT/PKWTT/Harian)',
            'options' => [
                ['key' => 'raw_contract_type', 'label' => 'Jenis Kontrak (Contract/Harian)'],
                ['key' => 'pkwt_1_start', 'label' => 'PKWT 1 - Mulai'],
                ['key' => 'pkwt_1_end', 'label' => 'PKWT 1 - Selesai'],
                ['key' => 'pkwt_2_start', 'label' => 'PKWT 2 - Mulai'],
                ['key' => 'pkwt_2_end', 'label' => 'PKWT 2 - Selesai'],
                ['key' => 'pkwt_3_start', 'label' => 'PKWT 3 - Mulai'],
                ['key' => 'pkwt_3_end', 'label' => 'PKWT 3 - Selesai'],
                ['key' => 'pkwt_4_start', 'label' => 'PKWT 4 - Mulai'],
                ['key' => 'pkwt_4_end', 'label' => 'PKWT 4 - Selesai'],
                ['key' => 'pkwt_5_start', 'label' => 'PKWT 5 - Mulai'],
                ['key' => 'pkwt_5_end', 'label' => 'PKWT 5 - Selesai'],
                ['key' => 'pkwt_6_start', 'label' => 'PKWT 6 - Mulai'],
                ['key' => 'pkwt_6_end', 'label' => 'PKWT 6 - Selesai'],
                ['key' => 'pkwt_7_start', 'label' => 'PKWT 7 - Mulai'],
                ['key' => 'pkwt_7_end', 'label' => 'PKWT 7 - Selesai'],
                ['key' => 'pkwt_8_start', 'label' => 'PKWT 8 - Mulai'],
                ['key' => 'pkwt_8_end', 'label' => 'PKWT 8 - Selesai'],
                ['key' => 'pkwtt_start', 'label' => 'PKWTT - Mulai'],
                ['key' => 'evaluation_notes', 'label' => 'Catatan Evaluasi Kontrak'],
            ],
        ],
        [
            'group' => 'Data Kompensasi (Gaji & Tunjangan)',
            'options' => [
                ['key' => 'base_salary', 'label' => 'Gaji Pokok'],
                ['key' => 'meal_allowance', 'label' => 'Tunjangan Makan'],
                ['key' => 'transport_allowance', 'label' => 'Tunjangan Transport'],
                ['key' => 'overtime_weekday', 'label' => 'Rate Lembur (Weekday)'],
                ['key' => 'overtime_holiday', 'label' => 'Rate Lembur (Weekend/Libur)'],
            ],
        ],
        [
            'group' => 'Data Keluarga - Pasangan 1',
            'options' => [
                ['key' => 'spouse_1_name', 'label' => 'Nama Istri/Suami (1)'],
                ['key' => 'spouse_1_birth_place', 'label' => 'Tempat Lahir Pasangan (1)'],
                ['key' => 'spouse_1_birth_date', 'label' => 'Tanggal Lahir Pasangan (1)'],
                ['key' => 'spouse_1_nik', 'label' => 'NIK Pasangan (1)'],
                ['key' => 'spouse_1_bpjs', 'label' => 'No BPJS Pasangan (1)'],
            ],
        ],
        [
            'group' => 'Data Keluarga - Anak (Pasangan 1)',
            'options' => [
                ['key' => 'child_1_1_name', 'label' => 'Nama Anak 1 (Pasangan 1)'],
                ['key' => 'child_1_1_birth_place', 'label' => 'Tempat Lahir Anak 1 (Pasangan 1)'],
                ['key' => 'child_1_1_birth_date', 'label' => 'Tanggal Lahir Anak 1 (Pasangan 1)'],
                ['key' => 'child_1_1_nik', 'label' => 'NIK Anak 1 (Pasangan 1)'],
                ['key' => 'child_1_1_bpjs', 'label' => 'BPJS Anak 1 (Pasangan 1)'],
                ['key' => 'child_2_1_name', 'label' => 'Nama Anak 2 (Pasangan 1)'],
                ['key' => 'child_2_1_birth_place', 'label' => 'Tempat Lahir Anak 2 (Pasangan 1)'],
                ['key' => 'child_2_1_birth_date', 'label' => 'Tanggal Lahir Anak 2 (Pasangan 1)'],
                ['key' => 'child_2_1_nik', 'label' => 'NIK Anak 2 (Pasangan 1)'],
                ['key' => 'child_2_1_bpjs', 'label' => 'BPJS Anak 2 (Pasangan 1)'],
                ['key' => 'child_3_1_name', 'label' => 'Nama Anak 3 (Pasangan 1)'],
                ['key' => 'child_3_1_birth_place', 'label' => 'Tempat Lahir Anak 3 (Pasangan 1)'],
                ['key' => 'child_3_1_birth_date', 'label' => 'Tanggal Lahir Anak 3 (Pasangan 1)'],
                ['key' => 'child_3_1_nik', 'label' => 'NIK Anak 3 (Pasangan 1)'],
                ['key' => 'child_3_1_bpjs', 'label' => 'BPJS Anak 3 (Pasangan 1)'],
            ],
        ],
        [
            'group' => 'Data Keluarga - Pasangan 2',
            'options' => [
                ['key' => 'spouse_2_name', 'label' => 'Nama Istri/Suami (2)'],
                ['key' => 'spouse_2_birth_place', 'label' => 'Tempat Lahir Pasangan (2)'],
                ['key' => 'spouse_2_birth_date', 'label' => 'Tanggal Lahir Pasangan (2)'],
                ['key' => 'spouse_2_nik', 'label' => 'NIK Pasangan (2)'],
                ['key' => 'spouse_2_bpjs', 'label' => 'No BPJS Pasangan (2)'],
            ],
        ],
        [
            'group' => 'Data Keluarga - Anak (Pasangan 2)',
            'options' => [
                ['key' => 'child_1_2_name', 'label' => 'Nama Anak 1 (Pasangan 2)'],
                ['key' => 'child_1_2_birth_place', 'label' => 'Tempat Lahir Anak 1 (Pasangan 2)'],
                ['key' => 'child_1_2_birth_date', 'label' => 'Tanggal Lahir Anak 1 (Pasangan 2)'],
                ['key' => 'child_1_2_nik', 'label' => 'NIK Anak 1 (Pasangan 2)'],
                ['key' => 'child_1_2_bpjs', 'label' => 'BPJS Anak 1 (Pasangan 2)'],
                ['key' => 'child_2_2_name', 'label' => 'Nama Anak 2 (Pasangan 2)'],
                ['key' => 'child_2_2_birth_place', 'label' => 'Tempat Lahir Anak 2 (Pasangan 2)'],
                ['key' => 'child_2_2_birth_date', 'label' => 'Tanggal Lahir Anak 2 (Pasangan 2)'],
                ['key' => 'child_2_2_nik', 'label' => 'NIK Anak 2 (Pasangan 2)'],
                ['key' => 'child_2_2_bpjs', 'label' => 'BPJS Anak 2 (Pasangan 2)'],
                ['key' => 'child_3_2_name', 'label' => 'Nama Anak 3 (Pasangan 2)'],
                ['key' => 'child_3_2_birth_place', 'label' => 'Tempat Lahir Anak 3 (Pasangan 2)'],
                ['key' => 'child_3_2_birth_date', 'label' => 'Tanggal Lahir Anak 3 (Pasangan 2)'],
                ['key' => 'child_3_2_nik', 'label' => 'NIK Anak 3 (Pasangan 2)'],
                ['key' => 'child_3_2_bpjs', 'label' => 'BPJS Anak 3 (Pasangan 2)'],
            ],
        ],
    ];

    /**
     * Smart auto-mapping dictionary.
     * Maps common CSV header substrings to database field keys.
     *
     * @var array<string, string>
     */
    private const AUTO_MAP_HINTS = [
        'nik aru' => 'nik_aru',
        'employee name' => 'name',
        'nama' => 'name',
        'ktp' => 'ktp_number',
        'jenis kelamin' => 'gender',
        'tempat lahir' => 'birth_place',
        'tanggal lahir' => 'birth_date',
        'alamat sesuai ktp' => 'address_ktp',
        'alamat sesuai domisili' => 'address_domicile',
        'no telp' => 'phone',
        'pendidikan' => 'education',
        'agama' => 'religion',
        'status ptkp' => 'tax_status',
        'no kk' => 'kk_number',
        'gaji pokok' => 'base_salary',
        'uang makan' => 'meal_allowance',
        't. transport' => 'transport_allowance',
        'overtime senin' => 'overtime_weekday',
        'overtime libur' => 'overtime_holiday',
        'npwp' => 'npwp',
        'bank' => 'bank_name',
        'rekening' => 'bank_account_number',
        'bpjs kesehatan' => 'bpjs_kesehatan',
        'bpjs ketenagakerjaan' => 'bpjs_ketenagakerjaan',
        'nama ibu' => 'mother_name',
        'project' => 'project_name',
        'cabang'     => 'branch_name',
        'branch'     => 'branch_name',
        'date of hire' => 'hire_date',
        'type of contract' => 'raw_contract_type',
        'jabatan' => 'position',
        'status' => 'status',
        'tanggal keluar' => 'termination_date',
        'pkwt 1 start' => 'pkwt_1_start',
        'pkwt 1 end' => 'pkwt_1_end',
        'pkwt 2 start' => 'pkwt_2_start',
        'pkwt 2 end' => 'pkwt_2_end',
        'pkwt 3 start' => 'pkwt_3_start',
        'pkwt 3 end' => 'pkwt_3_end',
        'pkwt 4 start' => 'pkwt_4_start',
        'pkwt 4 end' => 'pkwt_4_end',
        'pkwt 5 start' => 'pkwt_5_start',
        'pkwt 5 end' => 'pkwt_5_end',
        'pkwt 6 start' => 'pkwt_6_start',
        'pkwt 6 end' => 'pkwt_6_end',
        'pkwt 7 start' => 'pkwt_7_start',
        'pkwt 7 end' => 'pkwt_7_end',
        'pkwt 8 start' => 'pkwt_8_start',
        'pkwt 8 end' => 'pkwt_8_end',
        'pkwtt' => 'pkwtt_start',
        'nama istri/suami_1' => 'spouse_1_name',
        'tempat lahir istri/suami_1' => 'spouse_1_birth_place',
        'tanggal lahir istri/suami_1' => 'spouse_1_birth_date',
        'nik istri/suami_1' => 'spouse_1_nik',
        'bpjs istri/suami_1' => 'spouse_1_bpjs',
        'nama anak 1_1' => 'child_1_1_name',
        'tempat lahir anak 1_1' => 'child_1_1_birth_place',
        'tanggal lahir anak 1_1' => 'child_1_1_birth_date',
        'nik anak 1_1' => 'child_1_1_nik',
        'bpjs anak 1_1' => 'child_1_1_bpjs',
        'nama anak 2_1' => 'child_2_1_name',
        'tempat lahir anak 2_1' => 'child_2_1_birth_place',
        'tanggal lahir anak 2_1' => 'child_2_1_birth_date',
        'nik anak 2_1' => 'child_2_1_nik',
        'bpjs anak 2_1' => 'child_2_1_bpjs',
        'nama anak 3_1' => 'child_3_1_name',
        'tempat lahir anak 3_1' => 'child_3_1_birth_place',
        'tanggal lahir anak 3_1' => 'child_3_1_birth_date',
        'nik anak 3_1' => 'child_3_1_nik',
        'bpjs anak 3_1' => 'child_3_1_bpjs',
        'nama istri/suami_2' => 'spouse_2_name',
        'tempat lahir istri/suami_2' => 'spouse_2_birth_place',
        'tanggal lahir istri/suami_2' => 'spouse_2_birth_date',
        'nik istri/suami_2' => 'spouse_2_nik',
        'bpjs istri/suami_2' => 'spouse_2_bpjs',
        'nama anak 1_2' => 'child_1_2_name',
        'tempat lahir anak 1_2' => 'child_1_2_birth_place',
        'tanggal lahir anak 1_2' => 'child_1_2_birth_date',
        'nik anak 1_2' => 'child_1_2_nik',
        'bpjs anak 1_2' => 'child_1_2_bpjs',
        'nama anak 2_2' => 'child_2_2_name',
        'tempat lahir anak 2_2' => 'child_2_2_birth_place',
        'tanggal lahir anak 2_2' => 'child_2_2_birth_date',
        'nik anak 2_2' => 'child_2_2_nik',
        'bpjs anak 2_2' => 'child_2_2_bpjs',
        'nama anak 3_2' => 'child_3_2_name',
        'tempat lahir anak 3_2' => 'child_3_2_birth_place',
        'tanggal lahir anak 3_2' => 'child_3_2_birth_date',
        'nik anak 3_2' => 'child_3_2_nik',
        'bpjs anak 3_2' => 'child_3_2_bpjs',
    ];

    /**
     * Parse an uploaded CSV file, cache its data in Redis, and return preview information.
     *
     * @param \Illuminate\Http\UploadedFile $file The uploaded CSV file.
     * @param string $sessionId The unique session identifier for this import.
     * @return array{file_path: string, headers: string[], preview_data: string[][], total_rows: int, auto_mapping: array<string, int>}
     */
    public function parseAndCacheUpload($file, string $sessionId): array
    {
        $path = $file->storeAs('temp_imports', 'import_' . $sessionId . '.csv', 'local');
        $fullPath = Storage::disk('local')->path($path);

        $handle = fopen($fullPath, 'r');
        $headers = fgetcsv($handle);

        $previewData = [];
        $totalRows = 0;
        $count = 0;

        while (($row = fgetcsv($handle)) !== false) {
            // Skip empty rows
            if (empty(array_filter($row))) {
                continue;
            }
            $totalRows++;
            if ($count < self::PREVIEW_ROW_COUNT) {
                $previewData[] = $row;
                $count++;
            }
        }
        fclose($handle);

        // Auto-map CSV headers to DB fields
        $autoMapping = $this->autoMapHeaders($headers);

        // Cache to Redis
        $cacheData = [
            'file_path' => $path,
            'headers' => $headers,
            'total_rows' => $totalRows,
        ];

        Cache::put(
            self::REDIS_PREFIX . "session:{$sessionId}",
            json_encode($cacheData),
            self::CACHE_TTL
        );

        return [
            'file_path' => $path,
            'headers' => $headers,
            'preview_data' => $previewData,
            'total_rows' => $totalRows,
            'auto_mapping' => $autoMapping,
        ];
    }

    /**
     * Perform smart auto-mapping of CSV headers to database field keys.
     *
     * Uses a dictionary of common Indonesian and English header patterns
     * to suggest mappings. Ensures 1-to-1 mapping (no duplicate assignments).
     *
     * @param array $headers The CSV header row.
     * @return array<string, int> Mapping of db_field_key => csv_column_index.
     */
    public function autoMapHeaders(array $headers): array
    {
        $mapping = [];
        $usedIndices = [];

        // Sort hints by length desc so more specific matches take priority
        $sortedHints = self::AUTO_MAP_HINTS;
        uksort($sortedHints, fn($a, $b) => strlen($b) - strlen($a));

        foreach ($sortedHints as $headerHint => $dbKey) {
            if (isset($mapping[$dbKey])) {
                continue; // Already mapped this DB field
            }

            foreach ($headers as $index => $csvHeader) {
                if (in_array($index, $usedIndices)) {
                    continue; // This CSV column is already mapped
                }

                $lowerHeader = strtolower(trim($csvHeader));
                if (str_contains($lowerHeader, $headerHint)) {
                    $mapping[$dbKey] = $index;
                    $usedIndices[] = $index;
                    break;
                }
            }
        }

        return $mapping;
    }

    /**
     * Validate all rows in the uploaded CSV against per-module rules.
     *
     * Reads the file from the cached path, applies mapping and global settings
     * to build entity data, and validates each row. Returns per-row validation results.
     *
     * @param string $sessionId The import session ID.
     * @param array<string, int> $mapping The column mapping (db_field => csv_index).
     * @param array $globalSettings Global settings (project_id, department_id, rates, etc.).
     * @return array{results: array, summary: array{total: int, valid: int, errors: int, conflicts: int}}
     */
    public function validateAllRows(string $sessionId, array $mapping, array $globalSettings): array
    {
        $cached = $this->getCachedSession($sessionId);
        if (!$cached) {
            return ['results' => [], 'summary' => ['total' => 0, 'valid' => 0, 'errors' => 0, 'conflicts' => 0]];
        }

        $fullPath = Storage::disk('local')->path($cached['file_path']);
        if (!file_exists($fullPath)) {
            return ['results' => [], 'summary' => ['total' => 0, 'valid' => 0, 'errors' => 0, 'conflicts' => 0]];
        }

        $handle = fopen($fullPath, 'r');
        fgetcsv($handle); // Skip header

        $results = [];
        $validCount = 0;
        $errorCount = 0;
        $conflictCount = 0;
        $rowNumber = 0;
        $seenKtpNumbers = [];

        while (($row = fgetcsv($handle)) !== false) {
            if (empty(array_filter($row))) {
                continue;
            }

            $rowNumber++;

            // Validate the row and update the seen KTP tracker
            $validation = $this->validateSingleRow($row, $mapping, $globalSettings, $seenKtpNumbers);

            // Build preview of cleaned data for display
            $preview = $this->buildRowPreview($row, $mapping, $globalSettings);

            $result = [
                'row_number' => $rowNumber,
                'errors'     => $validation['errors'],
                'conflict'   => $validation['conflict'],
                'preview'    => $preview,
            ];

            if (count($validation['errors']) > 0) {
                $errorCount++;
            } elseif ($validation['conflict']) {
                $conflictCount++;
            } else {
                $validCount++;
            }

            $results[] = $result;
        }

        fclose($handle);

        // Cache validation results in Redis for the process step
        Cache::put(
            self::REDIS_PREFIX . "validation:{$sessionId}",
            json_encode(['mapping' => $mapping, 'global_settings' => $globalSettings]),
            self::CACHE_TTL
        );

        return [
            'results' => $results,
            'summary' => [
                'total'     => $rowNumber,
                'valid'     => $validCount,
                'errors'    => $errorCount,
                'conflicts' => $conflictCount,
            ],
        ];
    }

    /**
     * Validate a single CSV row and update the seen-KTP tracker.
     *
     * This is the canonical single-row validation entry point used by both
     * the preview step (validateAllRows) and the background import job
     * (ProcessBulkImport) to ensure consistent rules are enforced at all stages.
     *
     * @param array          $row              The raw CSV row.
     * @param array          $mapping          The column mapping (db_field => csv_index).
     * @param array          $globalSettings   Global settings (project_id, branch_id, rates).
     * @param array          &$seenKtpNumbers  KTP numbers already validated in this batch (updated in-place).
     * @return array{errors: string[], conflict: array|null}
     */
    public function validateSingleRow(
        array $row,
        array $mapping,
        array $globalSettings,
        array &$seenKtpNumbers
    ): array {
        // Validate Worker data (returns errors + optional conflict)
        $workerValidation = $this->validateWorkerData($row, $mapping, $seenKtpNumbers);
        $errors  = $workerValidation['errors'];
        $conflict = $workerValidation['conflict'];

        // Record KTP so subsequent rows in the same batch can detect duplicates
        $ktpRaw = ImportDataCleaner::extractField($row, $mapping, 'ktp_number');
        if ($ktpRaw) {
            $cleanedKtp = ImportDataCleaner::cleanIdentityNumber($ktpRaw);
            if ($cleanedKtp) {
                $seenKtpNumbers[] = $cleanedKtp;
            }
        }

        // Validate Assignment data
        $errors = array_merge($errors, $this->validateAssignmentData($row, $mapping, $globalSettings));

        // Validate Compensation data
        $errors = array_merge($errors, $this->validateCompensationData($row, $mapping, $globalSettings));

        return ['errors' => $errors, 'conflict' => $conflict];
    }

    /**
     * Validate worker fields for a single row.
     * Returns both validation errors and optional conflict data for duplicate KTPs.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @param array $seenKtpNumbers KTP numbers already seen in this batch.
     * @return array{errors: string[], conflict: array|null}
     */
    private function validateWorkerData(array $row, array $mapping, array $seenKtpNumbers): array
    {
        $errors = [];
        $conflict = null;
        $c = ImportDataCleaner::class;

        // Name is required
        $name = $c::extractField($row, $mapping, 'name');
        if (empty($name)) {
            $errors[] = 'Nama karyawan wajib diisi.';
        }

        // KTP number validation
        $ktpRaw = $c::extractField($row, $mapping, 'ktp_number');
        if (empty($ktpRaw)) {
            $errors[] = 'Nomor KTP (NIK) wajib diisi.';
        } else {
            $ktpClean = $c::cleanIdentityNumber($ktpRaw);
            if ($ktpClean && !preg_match('/^\d{16}$/', $ktpClean)) {
                $errors[] = "Nomor KTP harus 16 digit angka (ditemukan: {$ktpClean}).";
            }
            // Check duplicate within file
            if ($ktpClean && in_array($ktpClean, $seenKtpNumbers)) {
                $errors[] = 'Nomor KTP duplikat dalam file CSV.';
            }
            // Check duplicate in database → conflict (not error)
            if ($ktpClean) {
                $existingWorker = Worker::where('ktp_number', $ktpClean)->first();
                if ($existingWorker) {
                    $conflict = $this->buildConflictData($existingWorker, $row, $mapping);
                }
            }
        }

        // Optional field validations
        $kkRaw = $c::extractField($row, $mapping, 'kk_number');
        if ($kkRaw) {
            $kkClean = $c::cleanIdentityNumber($kkRaw);
            if ($kkClean && !preg_match('/^\d{16}$/', $kkClean)) {
                $errors[] = "Nomor KK harus 16 digit angka (ditemukan: {$kkClean}).";
            }
        }

        $npwpRaw = $c::extractField($row, $mapping, 'npwp');
        if ($npwpRaw) {
            $npwpClean = $c::cleanIdentityNumber($npwpRaw);
            if ($npwpClean && !preg_match('/^\d{15,16}$/', $npwpClean)) {
                $errors[] = "Nomor NPWP harus 15-16 digit angka (ditemukan: {$npwpClean}).";
            }
        }

        $bpjsKesRaw = $c::extractField($row, $mapping, 'bpjs_kesehatan');
        if ($bpjsKesRaw) {
            $bpjsKesClean = $c::cleanIdentityNumber($bpjsKesRaw);
            if ($bpjsKesClean && !preg_match('/^\d{13}$/', $bpjsKesClean)) {
                $errors[] = "No BPJS Kesehatan harus 13 digit (ditemukan: {$bpjsKesClean}).";
            }
        }

        $bpjsTkRaw = $c::extractField($row, $mapping, 'bpjs_ketenagakerjaan');
        if ($bpjsTkRaw) {
            $bpjsTkClean = $c::cleanIdentityNumber($bpjsTkRaw);
            if ($bpjsTkClean && !preg_match('/^\d{11}$/', $bpjsTkClean)) {
                $errors[] = "No BPJS Ketenagakerjaan harus 11 digit (ditemukan: {$bpjsTkClean}).";
            }
        }

        // Gender validation
        $genderRaw = $c::extractField($row, $mapping, 'gender');
        if ($genderRaw) {
            $gender = $c::parseGender($genderRaw);
            if (!$gender) {
                $errors[] = "Jenis kelamin tidak valid: '{$genderRaw}'. Gunakan L/P.";
            }
        }

        return ['errors' => $errors, 'conflict' => $conflict];
    }

    /**
     * Build conflict comparison data between an existing worker and incoming CSV data.
     * Shows side-by-side differences for the user to review.
     *
     * @param Worker $existing The existing worker from the database.
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @return array The conflict data with existing_id and field-level comparison.
     */
    private function buildConflictData(Worker $existing, array $row, array $mapping): array
    {
        $c = ImportDataCleaner::class;

        $compareFields = [
            ['key' => 'name', 'label' => 'Nama', 'existing' => $existing->name, 'incoming' => $c::extractField($row, $mapping, 'name')],
            ['key' => 'gender', 'label' => 'Jenis Kelamin', 'existing' => $existing->gender, 'incoming' => $c::parseGender($c::extractField($row, $mapping, 'gender'))],
            ['key' => 'birth_place', 'label' => 'Tempat Lahir', 'existing' => $existing->birth_place, 'incoming' => $c::extractField($row, $mapping, 'birth_place')],
            ['key' => 'birth_date', 'label' => 'Tanggal Lahir', 'existing' => $existing->birth_date, 'incoming' => $c::parseDate($c::extractField($row, $mapping, 'birth_date'))],
            ['key' => 'phone', 'label' => 'No HP', 'existing' => $existing->phone, 'incoming' => $c::cleanPhoneNumber($c::extractField($row, $mapping, 'phone'))],
            ['key' => 'education', 'label' => 'Pendidikan', 'existing' => $existing->education, 'incoming' => $c::parseEducation($c::extractField($row, $mapping, 'education'))],
            ['key' => 'religion', 'label' => 'Agama', 'existing' => $existing->religion, 'incoming' => $c::parseReligion($c::extractField($row, $mapping, 'religion'))],
            ['key' => 'address_ktp', 'label' => 'Alamat KTP', 'existing' => $existing->address_ktp, 'incoming' => $c::extractField($row, $mapping, 'address_ktp')],
            ['key' => 'npwp', 'label' => 'NPWP', 'existing' => $existing->npwp, 'incoming' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'npwp'))],
            ['key' => 'bpjs_kesehatan', 'label' => 'BPJS Kes', 'existing' => $existing->bpjs_kesehatan, 'incoming' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'bpjs_kesehatan'))],
            ['key' => 'bpjs_ketenagakerjaan', 'label' => 'BPJS TK', 'existing' => $existing->bpjs_ketenagakerjaan, 'incoming' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'bpjs_ketenagakerjaan'))],
            ['key' => 'bank_name', 'label' => 'Bank', 'existing' => $existing->bank_name, 'incoming' => $c::normalizeBankName($c::extractField($row, $mapping, 'bank_name'))],
            ['key' => 'bank_account_number', 'label' => 'No Rekening', 'existing' => $existing->bank_account_number, 'incoming' => $c::cleanBankAccountNumber($c::extractField($row, $mapping, 'bank_account_number'))],
        ];

        $diffs = [];
        foreach ($compareFields as $field) {
            $existingVal = $field['existing'] ?? '';
            $incomingVal = $field['incoming'] ?? '';
            if ($incomingVal === '' || $incomingVal === null) {
                continue;
            }
            if ((string)$existingVal !== (string)$incomingVal) {
                $diffs[] = [
                    'field' => $field['key'],
                    'label' => $field['label'],
                    'existing' => $existingVal ?: '(kosong)',
                    'incoming' => $incomingVal,
                ];
            }
        }

        return [
            'existing_id' => $existing->id,
            'existing_name' => $existing->name,
            'existing_ktp' => $existing->ktp_number,
            'diffs' => $diffs,
            'has_changes' => count($diffs) > 0,
        ];
    }

    /**
     * Validate assignment fields for a single row.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @param array $globalSettings Global settings containing project_id and branch_id.
     * @return array<string> List of error messages.
     */
    private function validateAssignmentData(array $row, array $mapping, array $globalSettings): array
    {
        $errors = [];
        $c = ImportDataCleaner::class;

        // Resolve project: CSV column first, fall back to global setting
        $projectName = ImportDataCleaner::extractField($row, $mapping, 'project_name');
        $projectResolved = $this->resolveProjectId($row, $mapping, $globalSettings);
        
        if (!$projectResolved) {
            // If project not found but client_id is set and projectName is in CSV, it will be auto-created
            if (empty($globalSettings['client_id']) || empty($projectName)) {
                $errors[] = 'Project tidak ditemukan. Pastikan nama project di CSV benar atau pilih di pengaturan global.';
            }
        }

        // Resolve department: CSV column first, fall back to global setting
        $branchName = ImportDataCleaner::extractField($row, $mapping, 'branch_name');
        $branchResolved = $this->resolveBranchId($row, $mapping, $globalSettings, $projectResolved);
        
        if (!$branchResolved) {
            // If branch not found but client_id is set and branchName is in CSV, it will be auto-created
            if (empty($globalSettings['client_id']) || empty($branchName)) {
                $errors[] = 'Cabang tidak ditemukan. Pastikan nama cabang di CSV benar atau pilih di pengaturan global.';
            }
        }

        // Hire date
        $hireDateRaw = $c::extractField($row, $mapping, 'hire_date');
        if ($hireDateRaw) {
            $hireDate = $c::parseDate($hireDateRaw);
            if (!$hireDate) {
                $errors[] = "Format tanggal masuk tidak valid: '{$hireDateRaw}'.";
            }
        }

        // Status validation
        $statusRaw = $c::extractField($row, $mapping, 'status');
        if ($statusRaw) {
            $parsed = $c::parseAssignmentStatus($statusRaw);
            if (!in_array($parsed['status'], ['active', 'contract expired', 'resign', 'fired', 'other'])) {
                $errors[] = "Status tidak valid: '{$statusRaw}'.";
            }
        }

        return $errors;
    }

    /**
     * Resolve project_id from CSV column (by name) or global settings.
     * CSV column takes priority over global settings.
     */
    private function resolveProjectId(array $row, array $mapping, array $globalSettings): ?int
    {
        // Try CSV column first
        $projectName = ImportDataCleaner::extractField($row, $mapping, 'project_name');
        if ($projectName) {
            $project = Project::where('name', 'ilike', trim($projectName))->first();
            if ($project) {
                return $project->id;
            }
        }

        // Fall back to global setting
        $globalId = $globalSettings['project_id'] ?? null;
        if ($globalId && Project::find($globalId)) {
            return (int) $globalId;
        }

        return null;
    }

    /**
     * Resolve branch_id from CSV column (by name) or global settings.
     * CSV column takes priority over global settings.
     * When resolved by name, scopes to the project's client.
     */
    private function resolveBranchId(array $row, array $mapping, array $globalSettings, ?int $projectId): ?int
    {
        // Try CSV column first
        $branchName = ImportDataCleaner::extractField($row, $mapping, 'branch_name');
        if ($branchName) {
            $query = Branch::where('name', 'ilike', trim($branchName));
            // Scope to the project's client_id (not project_id) if possible
            if ($projectId) {
                $project = Project::find($projectId);
                if ($project) {
                    $query->where('client_id', $project->client_id);
                }
            }
            $branch = $query->first();
            if ($branch) {
                return $branch->id;
            }
            // Try without client scope as fallback
            $branch = Branch::where('name', 'ilike', trim($branchName))->first();
            if ($branch) {
                return $branch->id;
            }
        }

        // Fall back to global setting
        $globalId = $globalSettings['branch_id'] ?? null;
        if ($globalId && Branch::find($globalId)) {
            return (int) $globalId;
        }

        return null;
    }

    /**
     * Validate compensation fields for a single row.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @param array $globalSettings Global settings.
     * @return array<string> List of error messages.
     */
    private function validateCompensationData(array $row, array $mapping, array $globalSettings): array
    {
        $errors = [];
        $c = ImportDataCleaner::class;

        // Validate rate settings from global
        $validRates = ['hourly', 'daily', 'monthly', 'yearly'];

        $salaryRate = $globalSettings['salary_rate'] ?? 'monthly';
        if (!in_array($salaryRate, $validRates)) {
            $errors[] = "Satuan gaji tidak valid: '{$salaryRate}'.";
        }

        $allowanceRate = $globalSettings['allowance_rate'] ?? 'daily';
        if (!in_array($allowanceRate, $validRates)) {
            $errors[] = "Satuan tunjangan tidak valid: '{$allowanceRate}'.";
        }

        $overtimeRate = $globalSettings['overtime_rate'] ?? 'hourly';
        if (!in_array($overtimeRate, $validRates)) {
            $errors[] = "Satuan lembur tidak valid: '{$overtimeRate}'.";
        }

        return $errors;
    }

    /**
     * Build a cleaned preview of data for a single row for display in the validation step.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @param array $globalSettings Global settings.
     * @return array Cleaned data preview grouped by module.
     */
    private function buildRowPreview(array $row, array $mapping, array $globalSettings): array
    {
        $c = ImportDataCleaner::class;

        return [
            'name' => $c::extractField($row, $mapping, 'name'),
            'ktp_number' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'ktp_number')),
            'status' => $c::parseAssignmentStatus($c::extractField($row, $mapping, 'status'))['status'] ?? 'active',
            'hire_date' => $c::parseDate($c::extractField($row, $mapping, 'hire_date')),
        ];
    }

    /**
     * Build complete Worker model data from a CSV row.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @return array The data array suitable for Worker::create().
     */
    public function buildWorkerData(array $row, array $mapping): array
    {
        $c = ImportDataCleaner::class;

        return [
            'nik_aru' => $c::extractField($row, $mapping, 'nik_aru'),
            'name' => $c::extractField($row, $mapping, 'name'),
            'ktp_number' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'ktp_number')),
            'kk_number' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'kk_number')),
            'birth_place' => $c::extractField($row, $mapping, 'birth_place'),
            'birth_date' => $c::parseDate($c::extractField($row, $mapping, 'birth_date')),
            'gender' => $c::parseGender($c::extractField($row, $mapping, 'gender')),
            'phone' => $c::cleanPhoneNumber($c::extractField($row, $mapping, 'phone')),
            'education' => $c::parseEducation($c::extractField($row, $mapping, 'education')),
            'religion' => $c::parseReligion($c::extractField($row, $mapping, 'religion')),
            'tax_status' => $c::parseTaxStatus($c::extractField($row, $mapping, 'tax_status')),
            'address_ktp' => $c::extractField($row, $mapping, 'address_ktp'),
            'address_domicile' => $c::extractField($row, $mapping, 'address_domicile'),
            'mother_name' => $c::extractField($row, $mapping, 'mother_name'),
            'npwp' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'npwp')),
            'bpjs_kesehatan' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'bpjs_kesehatan')),
            'bpjs_ketenagakerjaan' => $c::cleanIdentityNumber($c::extractField($row, $mapping, 'bpjs_ketenagakerjaan')),
            'bank_name' => $c::normalizeBankName($c::extractField($row, $mapping, 'bank_name')),
            'bank_account_number' => $c::cleanBankAccountNumber($c::extractField($row, $mapping, 'bank_account_number')),
        ];
    }

    /**
     * Build Assignment model data from a CSV row and global settings.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @param array $globalSettings Global settings (project_id, branch_id).
     * @return array The data array suitable for Assignment::create() (minus worker_id).
     */
    public function buildAssignmentData(array $row, array $mapping, array $globalSettings): array
    {
        $c = ImportDataCleaner::class;

        // Parse status from both STATUS column and TANGGAL KELUAR column
        $statusRaw = $c::extractField($row, $mapping, 'status');
        $termDateRaw = $c::extractField($row, $mapping, 'termination_date');

        $parsedStatus = $c::parseAssignmentStatus($statusRaw);

        // Resolve termination date: prefer explicit termination_date column, fallback to date in status
        $terminationDate = $c::parseTerminationDate($termDateRaw) ?? $parsedStatus['date'];

        // If status is active, ensure no termination date
        if ($parsedStatus['status'] === 'active') {
            $terminationDate = null;
        }

        // Resolve project_id and branch_id: CSV column takes priority, global settings as fallback
        $projectId = $this->resolveProjectId($row, $mapping, $globalSettings);
        if (!$projectId) {
            throw new \Exception('Project tidak ditemukan. Pastikan nama project di CSV benar atau pilih project di pengaturan global.');
        }

        $branchId = $this->resolveBranchId($row, $mapping, $globalSettings, $projectId);
        if (!$branchId) {
            throw new \Exception('Cabang tidak ditemukan. Pastikan nama cabang di CSV benar atau pilih cabang di pengaturan global.');
        }

        return [
            'project_id' => $projectId,
            'branch_id' => $branchId,
            'employee_id' => $c::extractField($row, $mapping, 'nik_tlj'),
            'position' => $c::extractField($row, $mapping, 'position'),
            'hire_date' => $c::parseDate($c::extractField($row, $mapping, 'hire_date')) ?? now()->format('Y-m-d'),
            'termination_date' => $terminationDate,
            'status' => $parsedStatus['status'],
        ];
    }

    /**
     * Build Contract model data from a CSV row (horizontal PKWT 1-8 to vertical).
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @param array $globalSettings Global settings (contract_type override).
     * @return array<int, array> Array of contract data suitable for Contract::create() (minus assignment_id).
     */
    public function buildContractsData(array $row, array $mapping, array $globalSettings): array
    {
        $c = ImportDataCleaner::class;
        $contracts = [];

        // Detect contract type
        $rawContractType = $c::extractField($row, $mapping, 'raw_contract_type');
        $contractType = isset($globalSettings['contract_type']) && $globalSettings['contract_type']
            ? $globalSettings['contract_type']
            : $c::parseContractType($rawContractType);

        $evalNotes = $c::extractField($row, $mapping, 'evaluation_notes');

        // Process PKWT 1-8
        for ($i = 1; $i <= 8; $i++) {
            $startRaw = $c::extractField($row, $mapping, "pkwt_{$i}_start");
            $start = $c::parseDate($startRaw);

            if ($start) {
                $endRaw = $c::extractField($row, $mapping, "pkwt_{$i}_end");
                $end = $c::parseDate($endRaw);

                $contracts[] = [
                    'contract_type' => $contractType,
                    'pkwt_type' => $contractType === 'Kontrak' ? 'PKWT' : null,
                    'pkwt_number' => $contractType === 'Kontrak' ? $i : null,
                    'start_date' => $start,
                    'end_date' => $end,
                    'evaluation_notes' => $evalNotes,
                ];
            }
        }

        // Check for PKWTT
        $pkwttRaw = $c::extractField($row, $mapping, 'pkwtt_start');
        $pkwttStart = $c::parseDate($pkwttRaw);
        if ($pkwttStart) {
            $contracts[] = [
                'contract_type' => 'Kontrak',
                'pkwt_type' => 'PKWTT',
                'pkwt_number' => null,
                'start_date' => $pkwttStart,
                'end_date' => null,
                'evaluation_notes' => $evalNotes,
            ];
        }

        return $contracts;
    }

    /**
     * Build ContractCompensation data from a CSV row and global settings.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @param array $globalSettings Global settings (salary_rate, allowance_rate, overtime_rate).
     * @return array The data array suitable for ContractCompensation::create() (minus contract_id).
     */
    public function buildCompensationData(array $row, array $mapping, array $globalSettings): array
    {
        $c = ImportDataCleaner::class;

        $salaryRate = $globalSettings['salary_rate'] ?? 'monthly';
        $allowanceRate = $globalSettings['allowance_rate'] ?? 'daily';
        $overtimeRate = $globalSettings['overtime_rate'] ?? 'hourly';

        // Parse overtime fields which may contain embedded rate info
        $overtimeWeekdayRaw = $c::extractField($row, $mapping, 'overtime_weekday');
        $overtimeHolidayRaw = $c::extractField($row, $mapping, 'overtime_holiday');

        $overtimeWeekday = $c::parseOvertimeRate($overtimeWeekdayRaw);
        $overtimeHoliday = $c::parseOvertimeRate($overtimeHolidayRaw);

        // Use embedded rate if detected, else fall back to global setting
        $resolvedOvertimeRate = $overtimeWeekday['rate'] ?? $overtimeHoliday['rate'] ?? $overtimeRate;

        return [
            'base_salary' => $c::cleanCurrency($c::extractField($row, $mapping, 'base_salary')),
            'salary_rate' => $salaryRate,
            'meal_allowance' => $c::cleanCurrency($c::extractField($row, $mapping, 'meal_allowance')),
            'transport_allowance' => $c::cleanCurrency($c::extractField($row, $mapping, 'transport_allowance')),
            'allowance_rate' => $allowanceRate,
            'overtime_weekday_rate' => $overtimeWeekday['amount'],
            'overtime_holiday_rate' => $overtimeHoliday['amount'],
            'overtime_rate' => $resolvedOvertimeRate,
        ];
    }

    /**
     * Build FamilyMember data from a CSV row.
     * Supports 2 spouse groups with up to 3 children each.
     *
     * @param array $row The CSV row data.
     * @param array $mapping The column mapping.
     * @return array<int, array> Array of family member data suitable for FamilyMember::create() (minus worker_id).
     */
    public function buildFamilyMembersData(array $row, array $mapping): array
    {
        $c = ImportDataCleaner::class;
        $members = [];

        // Process 2 spouse groups
        for ($spouseGroup = 1; $spouseGroup <= 2; $spouseGroup++) {
            $prefix = "spouse_{$spouseGroup}";
            $name = $c::extractField($row, $mapping, "{$prefix}_name");

            if ($name) {
                $members[] = [
                    'relationship_type' => 'spouse',
                    'name' => $name,
                    'birth_place' => $c::extractField($row, $mapping, "{$prefix}_birth_place"),
                    'birth_date' => $c::parseDate($c::extractField($row, $mapping, "{$prefix}_birth_date")),
                    'nik' => $c::cleanIdentityNumber($c::extractField($row, $mapping, "{$prefix}_nik")),
                    'bpjs_number' => $c::cleanIdentityNumber($c::extractField($row, $mapping, "{$prefix}_bpjs")),
                ];
            }

            // Process up to 3 children per spouse group
            for ($child = 1; $child <= 3; $child++) {
                $childPrefix = "child_{$child}_{$spouseGroup}";
                $childName = $c::extractField($row, $mapping, "{$childPrefix}_name");

                if ($childName) {
                    $members[] = [
                        'relationship_type' => 'child',
                        'name' => $childName,
                        'birth_place' => $c::extractField($row, $mapping, "{$childPrefix}_birth_place"),
                        'birth_date' => $c::parseDate($c::extractField($row, $mapping, "{$childPrefix}_birth_date")),
                        'nik' => $c::cleanIdentityNumber($c::extractField($row, $mapping, "{$childPrefix}_nik")),
                        'bpjs_number' => $c::cleanIdentityNumber($c::extractField($row, $mapping, "{$childPrefix}_bpjs")),
                    ];
                }
            }
        }

        return $members;
    }

    /**
     * Retrieve cached session data from Redis.
     *
     * @param string $sessionId The import session ID.
     * @return array|null The cached session data, or null if expired/missing.
     */
    public function getCachedSession(string $sessionId): ?array
    {
        $data = Cache::get(self::REDIS_PREFIX . "session:{$sessionId}");
        return $data ? json_decode($data, true) : null;
    }

    /**
     * Update import progress in Redis.
     *
     * @param string $sessionId The import session ID.
     * @param int $processed Number of rows processed so far.
     * @param int $total Total number of rows to process.
     * @param int $failed Number of rows that failed.
     * @param string $status Current status ('processing', 'completed', 'failed').
     * @param string|null $failedFilePath Path to the failed rows CSV file.
     * @return void
     */
    public function updateProgress(
        string $sessionId,
        int $processed,
        int $total,
        int $failed,
        string $status = 'processing',
        ?string $failedFilePath = null
    ): void {
        $data = [
            'processed' => $processed,
            'total' => $total,
            'failed' => $failed,
            'status' => $status,
            'failed_file_path' => $failedFilePath,
            'updated_at' => now()->toIso8601String(),
        ];

        Cache::put(
            self::REDIS_PREFIX . "progress:{$sessionId}",
            json_encode($data),
            self::CACHE_TTL
        );
    }

    /**
     * Get current import progress from Redis.
     *
     * @param string $sessionId The import session ID.
     * @return array|null The progress data, or null if not found.
     */
    public function getProgress(string $sessionId): ?array
    {
        $data = Cache::get(self::REDIS_PREFIX . "progress:{$sessionId}");
        return $data ? json_decode($data, true) : null;
    }

    /**
     * Generate a CSV template file with all mappable column headers.
     *
     * @return string The storage path of the generated template file.
     */
    public function generateTemplate(): string
    {
        $headers = [
            'No', 'NIK ARU', 'Nama Karyawan', 'Cabang',
            'Tanggal Masuk', 'Jenis Kontrak', 'Status', 'Tanggal Keluar',
            'Jabatan', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir',
            'Alamat KTP', 'Alamat Domisili', 'No Telp', 'Pendidikan',
            'Agama', 'Status PTKP', 'Gaji Pokok', 'Uang Makan',
            'Tunjangan Transport', 'Overtime Weekday', 'Overtime Libur',
            'NPWP', 'Bank', 'Rekening', 'BPJS Kesehatan',
            'BPJS Ketenagakerjaan', 'KTP', 'No KK', 'Nama Ibu Kandung',
            'PKWT 1 Start', 'PKWT 1 End', 'PKWT 2 Start', 'PKWT 2 End',
            'PKWT 3 Start', 'PKWT 3 End', 'PKWT 4 Start', 'PKWT 4 End',
            'PKWT 5 Start', 'PKWT 5 End', 'PKWT 6 Start', 'PKWT 6 End',
            'PKWT 7 Start', 'PKWT 7 End', 'PKWT 8 Start', 'PKWT 8 End',
            'PKWTT',
            'Nama Istri/Suami (1)', 'Tempat Lahir Pasangan (1)',
            'Tanggal Lahir Pasangan (1)', 'NIK Pasangan (1)', 'BPJS Pasangan (1)',
            'Nama Anak 1 (1)', 'Tempat Lahir Anak 1 (1)',
            'Tanggal Lahir Anak 1 (1)', 'NIK Anak 1 (1)', 'BPJS Anak 1 (1)',
            'Nama Anak 2 (1)', 'Tempat Lahir Anak 2 (1)',
            'Tanggal Lahir Anak 2 (1)', 'NIK Anak 2 (1)', 'BPJS Anak 2 (1)',
            'Nama Anak 3 (1)', 'Tempat Lahir Anak 3 (1)',
            'Tanggal Lahir Anak 3 (1)', 'NIK Anak 3 (1)', 'BPJS Anak 3 (1)',
            'Nama Istri/Suami (2)', 'Tempat Lahir Pasangan (2)',
            'Tanggal Lahir Pasangan (2)', 'NIK Pasangan (2)', 'BPJS Pasangan (2)',
            'Nama Anak 1 (2)', 'Tempat Lahir Anak 1 (2)',
            'Tanggal Lahir Anak 1 (2)', 'NIK Anak 1 (2)', 'BPJS Anak 1 (2)',
            'Nama Anak 2 (2)', 'Tempat Lahir Anak 2 (2)',
            'Tanggal Lahir Anak 2 (2)', 'NIK Anak 2 (2)', 'BPJS Anak 2 (2)',
            'Nama Anak 3 (2)', 'Tempat Lahir Anak 3 (2)',
            'Tanggal Lahir Anak 3 (2)', 'NIK Anak 3 (2)', 'BPJS Anak 3 (2)',
        ];

        $filePath = 'templates/import_template.csv';
        $content = fopen('php://temp', 'r+');
        fputcsv($content, $headers);
        rewind($content);
        Storage::disk('local')->put($filePath, stream_get_contents($content));
        fclose($content);

        return $filePath;
    }
}
