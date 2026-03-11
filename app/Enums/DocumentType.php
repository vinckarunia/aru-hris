<?php

namespace App\Enums;

/**
 * Enum DocumentType
 *
 * Represents all supported worker document types in the HRIS system.
 *
 * ## Scalability
 * To add a new document type, simply add a new case here (e.g. `case IJAZAH = 'IJAZAH'`).
 * No database migration is required because the `documents.type` column is stored
 * as a plain string, not a database-level ENUM.
 *
 * ## Cloud Storage Transition
 * Document files are currently stored on the local private disk (`Storage::disk('local')`).
 * To transition to cloud storage (e.g. AWS S3, Google Cloud Storage):
 *   1. Configure the cloud disk in `config/filesystems.php`.
 *   2. Set the `FILESYSTEM_DISK` environment variable (e.g. `FILESYSTEM_DISK=s3`) in `.env`.
 *   3. The `DocumentController` uses `Storage::disk(config('filesystems.default'))`,
 *      so no controller code changes are needed—only the environment variable.
 *
 * @package App\Enums
 */
enum DocumentType: string
{
    case KK  = 'KK';
    case KTP = 'KTP';

    /**
     * Returns a human-readable Indonesian label for the document type.
     *
     * @return string
     */
    public function label(): string
    {
        return match ($this) {
            self::KK  => 'Kartu Keluarga (KK)',
            self::KTP => 'Kartu Tanda Penduduk (KTP)',
        };
    }

    /**
     * Returns a short code label (e.g. for badge display).
     *
     * @return string
     */
    public function shortLabel(): string
    {
        return match ($this) {
            self::KK  => 'KK',
            self::KTP => 'KTP',
        };
    }

    /**
     * Returns all valid type values as a plain string array.
     * Useful for validation rules: `Rule::in(DocumentType::values())`.
     *
     * @return string[]
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
