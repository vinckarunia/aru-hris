<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Class ImportDataCleaner
 *
 * Provides static utility methods for cleaning and normalizing raw CSV data
 * into formats suitable for database insertion. Handles Indonesian-specific
 * formats for dates, currencies, identity numbers, and various enum values.
 *
 * @package App\Services
 */
class ImportDataCleaner
{
    /**
     * Indonesian month names mapped to their English equivalents.
     * Used by parseDate() for format conversion.
     */
    private const INDONESIAN_MONTHS = [
        'januari' => 'january',
        'februari' => 'february',
        'maret' => 'march',
        'april' => 'april',
        'mei' => 'may',
        'juni' => 'june',
        'juli' => 'july',
        'agustus' => 'august',
        'september' => 'september',
        'oktober' => 'october',
        'november' => 'november',
        'desember' => 'december',
    ];

    /**
     * Mapping of common Indonesian bank abbreviations/names to their standardized forms.
     */
    private const BANK_ALIASES = [
        'bri' => 'Bank Rakyat Indonesia (BRI)',
        'bank bri' => 'Bank Rakyat Indonesia (BRI)',
        'mandiri' => 'Bank Mandiri',
        'bank mandiri' => 'Bank Mandiri',
        'bca' => 'BCA',
        'bank bca' => 'BCA',
        'bni' => 'Bank Negara Indonesia (BNI)',
        'bank bni' => 'Bank Negara Indonesia (BNI)',
        'btn' => 'Bank Tabungan Negara (BTN)',
        'bank btn' => 'Bank Tabungan Negara (BTN)',
        'bsi' => 'Bank Syariah Indonesia (BSI)',
        'bank bsi' => 'Bank Syariah Indonesia (BSI)',
        'cimb' => 'CIMB Niaga',
        'cimb niaga' => 'CIMB Niaga',
        'danamon' => 'Bank Danamon',
        'bank danamon' => 'Bank Danamon',
        'permata' => 'Bank Permata',
        'bank permata' => 'Bank Permata',
        'mega' => 'Bank Mega',
        'bank mega' => 'Bank Mega',
        'panin' => 'Panin Bank',
        'panin bank' => 'Panin Bank',
        'ocbc' => 'OCBC NISP',
        'ocbc nisp' => 'OCBC NISP',
        'maybank' => 'Maybank Indonesia',
        'bank dki' => 'Bank DKI',
        'bjb' => 'Bank BJB',
        'bank bjb' => 'Bank BJB',
        'jago' => 'Bank Jago',
        'bank jago' => 'Bank Jago',
        'seabank' => 'SeaBank',
        'jenius' => 'Jenius (BTPN)',
    ];

    /**
     * Clean a raw currency string into a numeric float value.
     *
     * Handles formats like:
     * - "Rp 5,067,381"
     * - "Rp -"
     * - "Rp 0"
     * - "12500 / Jam"
     * - "15.000/ jam setlah 8 jam kerja"
     * - "100.000 / Hari"
     *
     * The method strips everything except digits, extracting only the
     * numeric portion of the string.
     *
     * @param string|null $value The raw currency string from CSV.
     * @return float The cleaned numeric value, or 0.0 if empty/invalid.
     */
    public static function cleanCurrency(?string $value): float
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return 0.0;
        }

        $value = trim($value);

        // Remove "Rp" prefix and common text suffixes
        $value = preg_replace('/^rp\s*/i', '', $value);

        // Check for dash after Rp removal (e.g., "Rp -")
        if (trim($value) === '-' || trim($value) === '0') {
            return 0.0;
        }

        // Handle Indonesian thousand separator (.) vs decimal
        // "15.000" → 15000, "5.067.381" → 5067381
        // But "15.50" could be decimal — we assume Indonesian format (dot = thousand)
        // since salary/allowance values are always whole numbers in IDR

        // Remove everything after "/" or "per" to strip rate info ("12500 / Jam" → "12500")
        $value = preg_replace('/\s*[\/]\s*.*/i', '', $value);
        $value = preg_replace('/\s+per\s+.*/i', '', $value);
        $value = preg_replace('/\s*setlah\s*.*/i', '', $value);
        $value = preg_replace('/\s*setelah\s*.*/i', '', $value);

        // Remove all non-numeric characters except dots and commas
        $cleaned = preg_replace('/[^0-9.,]/', '', trim($value));

        // Handle mixed separators: "5,067,381" or "5.067.381"
        // If there are multiple dots or commas, they're thousand separators
        $dotCount = substr_count($cleaned, '.');
        $commaCount = substr_count($cleaned, ',');

        if ($dotCount > 1 || ($dotCount === 1 && $commaCount >= 1)) {
            // Dots are thousand separators
            $cleaned = str_replace('.', '', $cleaned);
            $cleaned = str_replace(',', '.', $cleaned);
        } elseif ($commaCount > 1 || ($commaCount === 1 && $dotCount >= 1)) {
            // Commas are thousand separators
            $cleaned = str_replace(',', '', $cleaned);
        } elseif ($commaCount === 1 && $dotCount === 0) {
            // Single comma — could be thousand or decimal; in IDR context, treat as thousand
            $afterComma = substr($cleaned, strrpos($cleaned, ',') + 1);
            if (strlen($afterComma) === 3) {
                $cleaned = str_replace(',', '', $cleaned);
            } else {
                $cleaned = str_replace(',', '.', $cleaned);
            }
        } elseif ($dotCount === 1 && $commaCount === 0) {
            // Single dot — check if thousand separator (e.g., "15.000")
            $afterDot = substr($cleaned, strrpos($cleaned, '.') + 1);
            if (strlen($afterDot) === 3) {
                $cleaned = str_replace('.', '', $cleaned);
            }
            // Otherwise keep as decimal
        }

        return (float) ($cleaned ?: 0);
    }

    /**
     * Parse various date string formats into a standardized Y-m-d format.
     *
     * Handles:
     * - DD/MM/YYYY: "01/06/2019"
     * - DD-MM-YYYY: "01-06-2019"
     * - DD Month(ID) YYYY: "01 Juni 2019", "30 Mei 2020"
     * - Mixed: "01/05/2020", "30 April 2021"
     * - Empty/dash: returns null
     *
     * @param string|null $dateString The raw date string from CSV.
     * @return string|null The date in Y-m-d format, or null if unparseable.
     */
    public static function parseDate(?string $dateString): ?string
    {
        if (is_null($dateString) || trim($dateString) === '' || trim($dateString) === '-') {
            return null;
        }

        $dateString = trim($dateString);

        // Replace Indonesian month names with English equivalents
        $dateString = str_ireplace(
            array_keys(self::INDONESIAN_MONTHS),
            array_values(self::INDONESIAN_MONTHS),
            $dateString
        );

        // Normalize slashes to dashes for consistent parsing
        $normalized = str_replace('/', '-', $dateString);

        // Try standard Carbon parsing first (handles "01 January 2019", "2019-01-01", etc.)
        try {
            // Check if format is DD-MM-YYYY (common in Indonesian CSV)
            if (preg_match('/^(\d{1,2})-(\d{1,2})-(\d{4})$/', $normalized, $matches)) {
                $day = (int) $matches[1];
                $month = (int) $matches[2];
                $year = (int) $matches[3];

                // Validate that day and month are within range
                if ($month >= 1 && $month <= 12 && $day >= 1 && $day <= 31) {
                    return Carbon::createFromDate($year, $month, $day)->format('Y-m-d');
                }
            }

            return Carbon::parse($dateString)->format('Y-m-d');
        } catch (\Exception $e) {
            Log::warning("ImportDataCleaner: Failed to parse date string: '{$dateString}'");
            return null;
        }
    }

    /**
     * Parse gender abbreviation into standardized database enum value.
     *
     * @param string|null $value Raw gender value (e.g., "L", "P", "Laki-laki", "Perempuan").
     * @return string|null "male", "female", or null if unrecognized.
     */
    public static function parseGender(?string $value): ?string
    {
        if (is_null($value) || trim($value) === '') {
            return null;
        }

        $lower = strtolower(trim($value));

        if (in_array($lower, ['l', 'laki-laki', 'laki', 'male', 'pria'])) {
            return 'male';
        }

        if (in_array($lower, ['p', 'perempuan', 'female', 'wanita'])) {
            return 'female';
        }

        return null;
    }

    /**
     * Normalize tax status (PTKP) into standardized format with slash separator.
     *
     * Handles variations like:
     * - "K1" → "K/1"
     * - "TK" → "TK/0"
     * - "K/0" → "K/0" (already normalized)
     * - "TK/0" → "TK/0"
     * - "K3" → "K/3"
     *
     * @param string|null $value The raw tax status string.
     * @return string|null The normalized tax status, or null if empty.
     */
    public static function parseTaxStatus(?string $value): ?string
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return null;
        }

        $value = strtoupper(trim($value));

        // Already has slash — normalize
        if (str_contains($value, '/')) {
            // Handle "K/0", "TK/0", etc.
            return $value;
        }

        // "TK" without number → TK/0
        if ($value === 'TK') {
            return 'TK/0';
        }

        // "TK0", "TK1", etc.
        if (preg_match('/^TK(\d)$/', $value, $matches)) {
            return 'TK/' . $matches[1];
        }

        // "K" without number → K/0
        if ($value === 'K') {
            return 'K/0';
        }

        // "K1", "K2", "K3"
        if (preg_match('/^K(\d)$/', $value, $matches)) {
            return 'K/' . $matches[1];
        }

        return $value;
    }

    /**
     * Parse assignment status text from CSV into structured status and termination date.
     *
     * Handles formats like:
     * - "AKTIF" → {status: "active", date: null}
     * - "Resign" → {status: "resign", date: null}
     * - "Resign (30/10/2023)" → {status: "resign", date: "2023-10-30"}
     * - "Resign,30/10/2023" → {status: "resign", date: "2023-10-30"}
     * - "Habis Kontrak" → {status: "contract expired", date: null}
     * - "Habis Kontrak (25/02/2022)" → {status: "contract expired", date: "2022-02-25"}
     * - "Diberhentikan (29/10/2024)" → {status: "fired", date: "2024-10-29"}
     * - "Resign (22/08/2022)" embedded in status column
     *
     * @param string|null $statusString The raw status text from CSV.
     * @return array{status: string, date: string|null} Parsed status and optional termination date.
     */
    public static function parseAssignmentStatus(?string $statusString): array
    {
        $result = ['status' => 'active', 'date' => null];

        if (is_null($statusString) || trim($statusString) === '' || trim($statusString) === '-') {
            return $result;
        }

        $lower = strtolower(trim($statusString));

        // Determine status
        if (str_contains($lower, 'aktif') || str_contains($lower, 'active')) {
            $result['status'] = 'active';
        } elseif (str_contains($lower, 'resign')) {
            $result['status'] = 'resign';
        } elseif (str_contains($lower, 'habis kontrak') || str_contains($lower, 'expired')) {
            $result['status'] = 'contract expired';
        } elseif (str_contains($lower, 'diberhentikan') || str_contains($lower, 'fired')) {
            $result['status'] = 'fired';
        } else {
            $result['status'] = 'other';
        }

        // Extract date from parentheses: "Resign (30/10/2023)"
        if (preg_match('/\(([^)]+)\)/', $statusString, $matches)) {
            $dateCandidate = trim($matches[1]);
            $parsed = self::parseDate($dateCandidate);
            if ($parsed) {
                $result['date'] = $parsed;
            }
        }

        return $result;
    }

    /**
     * Parse a termination date string that may contain status text or special formats.
     *
     * Handles:
     * - "30/10/2023" → "2023-10-30"
     * - "Resign (30/9/2021)" → "2021-09-30"
     * - "Habis Kontrak (25/02/2022)" → "2022-02-25"
     * - "(30/9/2021)" → "2021-09-30"
     * - Empty → null
     *
     * @param string|null $value The raw termination date string from CSV.
     * @return string|null The parsed date in Y-m-d format, or null.
     */
    public static function parseTerminationDate(?string $value): ?string
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return null;
        }

        $value = trim($value);

        // Try extracting date from parentheses first
        if (preg_match('/\(([^)]+)\)/', $value, $matches)) {
            $parsed = self::parseDate(trim($matches[1]));
            if ($parsed) {
                return $parsed;
            }
        }

        // Try parsing the whole string as a date
        $parsed = self::parseDate($value);
        if ($parsed) {
            return $parsed;
        }

        return null;
    }

    /**
     * Parse overtime rate string to extract amount and rate type.
     *
     * Handles:
     * - "12500 / Jam" → {amount: 12500, rate: "hourly"}
     * - "15000 / jam" → {amount: 15000, rate: "hourly"}
     * - "15.000/ jam setlah 8 jam kerja" → {amount: 15000, rate: "hourly"}
     * - "100.000 / Hari" → {amount: 100000, rate: "daily"}
     * - "Rp -" → {amount: 0, rate: null}
     *
     * @param string|null $value The raw overtime rate string.
     * @return array{amount: float, rate: string|null} The extracted amount and rate type.
     */
    public static function parseOvertimeRate(?string $value): array
    {
        $result = ['amount' => 0.0, 'rate' => null];

        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return $result;
        }

        $lower = strtolower(trim($value));

        // Check for "Rp -" or just "-"
        $stripped = preg_replace('/^rp\s*/i', '', trim($value));
        if (trim($stripped) === '-' || trim($stripped) === '0') {
            return $result;
        }

        // Detect rate type from string
        if (str_contains($lower, 'jam') || str_contains($lower, 'hour')) {
            $result['rate'] = 'hourly';
        } elseif (str_contains($lower, 'hari') || str_contains($lower, 'day')) {
            $result['rate'] = 'daily';
        } elseif (str_contains($lower, 'bulan') || str_contains($lower, 'month')) {
            $result['rate'] = 'monthly';
        }

        // Extract the numeric amount
        $result['amount'] = self::cleanCurrency($value);

        return $result;
    }

    /**
     * Clean phone number, handling multiple numbers separated by "/" or ",".
     * Returns only the first valid number.
     *
     * @param string|null $value The raw phone number string.
     * @return string|null The cleaned first phone number, or null if empty.
     */
    public static function cleanPhoneNumber(?string $value): ?string
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return null;
        }

        $value = trim($value);

        // Split by "/" or "," to handle multiple numbers
        $parts = preg_split('/\s*[\/,]\s*/', $value);

        foreach ($parts as $part) {
            $cleaned = trim($part);
            // Remove non-digit characters except leading +
            $cleaned = preg_replace('/[^0-9+]/', '', $cleaned);

            // Must be at least 8 digits to be a valid phone
            if (strlen(preg_replace('/[^0-9]/', '', $cleaned)) >= 8) {
                return $cleaned;
            }
        }

        // Fallback: return cleaned original
        $cleaned = preg_replace('/[^0-9+]/', '', $value);
        return $cleaned ?: null;
    }

    /**
     * Clean identity number strings (KTP, KK, BPJS, NPWP).
     *
     * Handles:
     * - "19050237668 /18123689657" → "19050237668" (first number)
     * - "0001625447586" → "0001625447586"
     * - "0" → null (treat as empty)
     * - "0001767921096" → "0001767921096"
     * - "0001217266762 PBI/APBD" → "0001217266762" (strip text suffixes)
     * - "0001771223411 PEMPROV DKI JAKARTA" → "0001771223411"
     * - "4799-01-024019-53-9" → "4799010240195309" (strip dashes for account numbers)
     *
     * @param string|null $value The raw identity number string.
     * @param bool $stripDashes Whether to remove dashes (useful for bank accounts).
     * @return string|null The cleaned identity number, or null if empty/zero.
     */
    public static function cleanIdentityNumber(?string $value, bool $stripDashes = false): ?string
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return null;
        }

        $value = trim($value);

        // Treat "0" as null/empty
        if ($value === '0') {
            return null;
        }

        // Split by "/" or space to handle multiple numbers or text suffixes
        // "19050237668 /18123689657" → take first
        // "0001217266762 PBI/APBD" → take first number-like segment
        $parts = preg_split('/\s*[\/]\s*/', $value);
        $candidate = trim($parts[0]);

        // Remove any trailing text (non-numeric characters at the end)
        // "0001217266762 PBI" → "0001217266762"
        $candidate = preg_replace('/\s+[A-Za-z].*$/', '', $candidate);

        if ($stripDashes) {
            $candidate = str_replace('-', '', $candidate);
        }

        $candidate = trim($candidate);

        // Final check: must contain at least some digits
        if (!preg_match('/\d/', $candidate)) {
            return null;
        }

        return $candidate ?: null;
    }

    /**
     * Clean bank account number, stripping dashes and non-numeric characters.
     *
     * @param string|null $value The raw bank account number.
     * @return string|null The cleaned account number (digits only), or null.
     */
    public static function cleanBankAccountNumber(?string $value): ?string
    {
        return self::cleanIdentityNumber($value, true);
    }

    /**
     * Normalize education level string to match the system's predefined values.
     *
     * @param string|null $value The raw education string (e.g., "SMA", "S1", "D3").
     * @return string|null The normalized education level, or null if empty.
     */
    public static function parseEducation(?string $value): ?string
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return null;
        }

        $upper = strtoupper(trim($value));

        $map = [
            'SD' => 'SD',
            'SMP' => 'SMP',
            'SMA' => 'SMA/SMK',
            'SMK' => 'SMA/SMK',
            'SMA/SMK' => 'SMA/SMK',
            'SLTA' => 'SMA/SMK',
            'D1' => 'D1',
            'D2' => 'D2',
            'D3' => 'D3',
            'D4' => 'D4',
            'S1' => 'S1',
            'S2' => 'S2',
            'S3' => 'S3',
        ];

        return $map[$upper] ?? $value;
    }

    /**
     * Normalize a bank name to its standardized form.
     *
     * @param string|null $value The raw bank name string.
     * @return string|null The standardized bank name, or the original if no alias found.
     */
    public static function normalizeBankName(?string $value): ?string
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return null;
        }

        $lower = strtolower(trim($value));

        return self::BANK_ALIASES[$lower] ?? trim($value);
    }

    /**
     * Normalize a religion string to the system's predefined values.
     *
     * @param string|null $value The raw religion string.
     * @return string|null The normalized religion name, or null if empty.
     */
    public static function parseReligion(?string $value): ?string
    {
        if (is_null($value) || trim($value) === '' || trim($value) === '-') {
            return null;
        }

        $lower = strtolower(trim($value));

        $map = [
            'islam' => 'Islam',
            'kristen' => 'Kristen',
            'katolik' => 'Katolik',
            'hindu' => 'Hindu',
            'buddha' => 'Buddha',
            'budha' => 'Buddha',
            'konghucu' => 'Konghucu',
            'khonghucu' => 'Konghucu',
        ];

        return $map[$lower] ?? ucfirst(trim($value));
    }

    /**
     * Normalize a contract type string from CSV to the database enum value.
     *
     * @param string|null $value The raw contract type (e.g., "Contract", "Harian").
     * @return string The normalized contract type: "Kontrak" or "Harian".
     */
    public static function parseContractType(?string $value): string
    {
        if (is_null($value) || trim($value) === '') {
            return 'Kontrak';
        }

        $lower = strtolower(trim($value));

        if (str_contains($lower, 'harian') || str_contains($lower, 'daily')) {
            return 'Harian';
        }

        return 'Kontrak';
    }

    /**
     * Extract a value from a CSV row using the column mapping.
     *
     * @param array $row The CSV row data (indexed array).
     * @param array $mapping The column mapping (db_field => csv_column_index).
     * @param string $field The database field name to look up.
     * @return string|null The trimmed value, or null if empty/unmapped.
     */
    public static function extractField(array $row, array $mapping, string $field): ?string
    {
        if (!isset($mapping[$field])) {
            return null;
        }

        $index = (int) $mapping[$field];

        if (!isset($row[$index])) {
            return null;
        }

        $val = trim($row[$index]);
        return $val === '' ? null : $val;
    }
}
