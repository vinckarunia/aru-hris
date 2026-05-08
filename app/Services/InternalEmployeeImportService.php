<?php

namespace App\Services;

use App\Models\InternalEmployee;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Str;

class InternalEmployeeImportService
{
    private const REDIS_PREFIX = 'import_internal:';
    private const CACHE_TTL = 3600;
    
    public function parseAndCacheUpload($file, $sessionId)
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $path = $file->storeAs('imports', "{$sessionId}.{$extension}");
        $fullPath = Storage::disk('local')->path($path);

        $sheets = [];
        if ($extension === 'csv') {
            $handle = fopen($fullPath, 'r');
            $rows = [];
            while (($row = fgetcsv($handle)) !== false) {
                if (!empty(array_filter($row))) {
                    $rows[] = $row;
                }
            }
            fclose($handle);
            $sheets[] = ['name' => 'Sheet1', 'all_rows' => $rows, 'total_rows' => count($rows)];
        } else {
            $reader = IOFactory::createReaderForFile($fullPath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($fullPath);
            
            foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                $rows = $worksheet->toArray();
                $filteredRows = array_filter($rows, function($row) {
                    return !empty(array_filter($row));
                });
                if (!empty($filteredRows)) {
                    $sheets[] = [
                        'name' => $worksheet->getTitle(),
                        'all_rows' => array_values($filteredRows),
                        'total_rows' => count($filteredRows),
                    ];
                }
            }
        }

        Cache::put(self::REDIS_PREFIX . $sessionId, [
            'file_path' => $path,
            'extension' => $extension,
            'total_rows' => collect($sheets)->sum('total_rows')
        ], self::CACHE_TTL);

        return ['sheets' => $sheets];
    }
    
    public function getCachedSession($sessionId)
    {
        return Cache::get(self::REDIS_PREFIX . $sessionId);
    }
    
    public function validateAllRows($sessionId, $mapping, $headerRow, $activeSheetName = null)
    {
        $cached = $this->getCachedSession($sessionId);
        if (!$cached) return null;
        
        $fullPath = Storage::disk('local')->path($cached['file_path']);
        $results = [];
        $validCount = 0; $errorCount = 0; $conflictCount = 0; $rowNumber = 0;
        
        $processRow = function($row) use (&$rowNumber, &$validCount, &$errorCount, &$conflictCount, &$results, $mapping) {
            $rowNumber++;
            $c = ImportDataCleaner::class;
            $errors = [];
            
            $name = $c::extractField($row, $mapping, 'name');
            if (empty($name)) $errors[] = 'Nama wajib diisi.';
            
            $ktpRaw = $c::extractField($row, $mapping, 'ktp_number');
            $ktpClean = $c::cleanIdentityNumber($ktpRaw);
            if (empty($ktpClean)) {
                $errors[] = 'KTP wajib diisi.';
            } else if (!preg_match('/^\d{16}$/', $ktpClean)) {
                $errors[] = "KTP harus 16 digit (ditemukan: {$ktpClean}).";
            }
            
            $conflict = null;
            if (empty($errors) && $ktpClean) {
                $existing = InternalEmployee::where('ktp_number', $ktpClean)->first();
                if ($existing) {
                    $conflict = ['existing_name' => $existing->name, 'has_changes' => true];
                }
            }
            
            if (count($errors) > 0) $errorCount++;
            else if ($conflict) $conflictCount++;
            else $validCount++;
            
            $results[] = [
                'row_number' => $rowNumber,
                'errors' => $errors,
                'conflict' => $conflict,
                'preview' => [
                    'name' => $name,
                    'ktp_number' => $ktpClean,
                    'status' => $c::extractField($row, $mapping, 'status'),
                    'hire_date' => $c::extractField($row, $mapping, 'join_date'),
                ]
            ];
        };
        
        if ($cached['extension'] === 'csv') {
            $handle = fopen($fullPath, 'r');
            $allRows = [];
            while (($row = fgetcsv($handle)) !== false) {
                if (!empty(array_filter($row))) $allRows[] = $row;
            }
            fclose($handle);
            for ($i = $headerRow; $i < count($allRows); $i++) {
                $processRow($allRows[$i]);
            }
        } else {
            $reader = IOFactory::createReaderForFile($fullPath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($fullPath);
            foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                if ($activeSheetName && $worksheet->getTitle() !== $activeSheetName) continue;
                $rows = $worksheet->toArray();
                $filteredRows = array_values(array_filter($rows, function($row) {
                    return !empty(array_filter($row));
                }));
                for ($i = $headerRow; $i < count($filteredRows); $i++) {
                    $processRow($filteredRows[$i]);
                }
            }
        }
        
        return [
            'results' => $results,
            'summary' => ['total' => $rowNumber, 'valid' => $validCount, 'errors' => $errorCount, 'conflicts' => $conflictCount]
        ];
    }
    
    public function process($sessionId, $mapping, $rowActions, $headerRow, $activeSheetName = null)
    {
        $cached = $this->getCachedSession($sessionId);
        if (!$cached) return false;
        
        $this->updateProgress($sessionId, 0, $cached['total_rows'], 0, 'processing');
        $fullPath = Storage::disk('local')->path($cached['file_path']);
        $processed = 0;
        
        $doRow = function($row, $rowNumber) use ($mapping, $rowActions, &$processed) {
            $action = $rowActions[$rowNumber] ?? 'update';
            if ($action === 'skip') {
                $processed++;
                return;
            }
            
            $c = ImportDataCleaner::class;
            $ktpRaw = $c::extractField($row, $mapping, 'ktp_number');
            $ktpClean = $c::cleanIdentityNumber($ktpRaw);
            if (!$ktpClean) return;
            
            $name = $c::extractField($row, $mapping, 'name');
            if (!$name) return;
            
            $data = [
                'nik_aru' => $c::extractField($row, $mapping, 'nik_aru'),
                'name' => \App\Models\InternalEmployee::normalizeName($name),
                'ktp_number' => $ktpClean,
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
                'position' => $c::extractField($row, $mapping, 'position'),
                'department' => $c::extractField($row, $mapping, 'department'),
                'join_date' => $c::parseDate($c::extractField($row, $mapping, 'join_date')),
                'status' => strtolower(trim($c::extractField($row, $mapping, 'status') ?? 'active')) === 'active' ? 'active' : 'inactive',
            ];
            
            InternalEmployee::updateOrCreate(['ktp_number' => $ktpClean], $data);
            $processed++;
        };
        
        $rowNumber = 0;
        if ($cached['extension'] === 'csv') {
            $handle = fopen($fullPath, 'r');
            $allRows = [];
            while (($row = fgetcsv($handle)) !== false) {
                if (!empty(array_filter($row))) $allRows[] = $row;
            }
            fclose($handle);
            for ($i = $headerRow; $i < count($allRows); $i++) {
                $rowNumber++;
                $doRow($allRows[$i], $rowNumber);
            }
        } else {
            $reader = IOFactory::createReaderForFile($fullPath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($fullPath);
            foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                if ($activeSheetName && $worksheet->getTitle() !== $activeSheetName) continue;
                $rows = $worksheet->toArray();
                $filteredRows = array_values(array_filter($rows, function($row) {
                    return !empty(array_filter($row));
                }));
                for ($i = $headerRow; $i < count($filteredRows); $i++) {
                    $rowNumber++;
                    $doRow($filteredRows[$i], $rowNumber);
                }
            }
        }
        
        $this->updateProgress($sessionId, $processed, $cached['total_rows'], 0, 'completed');
        return true;
    }
    
    public function updateProgress($sessionId, $processed, $total, $failed, $status)
    {
        Cache::put(self::REDIS_PREFIX . "progress:{$sessionId}", [
            'processed' => $processed,
            'total' => $total,
            'failed' => $failed,
            'status' => $status,
            'updated_at' => now()->toIso8601String()
        ], self::CACHE_TTL);
    }
    
    public function getProgress($sessionId)
    {
        return Cache::get(self::REDIS_PREFIX . "progress:{$sessionId}");
    }
}
