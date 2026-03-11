<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Worker;
use App\Models\Assignment;
use App\Enums\DocumentType;
use App\Traits\HasHashid;

/**
 * Class Document
 *
 * Represents a worker identity document stored in the HRIS system.
 *
 * ## Supported Document Types
 * All valid types are defined in {@see \App\Enums\DocumentType}.
 * To add a new type, add a case to that Enum — no DB migration needed.
 *
 * ## Cloud Storage Transition
 * The `file_path` attribute stores a relative path within the configured storage disk.
 * Currently uses `Storage::disk(config('filesystems.default'))` (defaults to local private disk).
 * To transition to cloud storage (e.g. S3):
 *   1. Configure the cloud disk in `config/filesystems.php`.
 *   2. Change the `FILESYSTEM_DISK` env variable to the new disk name (e.g. `s3`).
 *   3. No code changes required — the controller resolves the disk at runtime.
 *
 * @property int                              $id
 * @property int|null                         $worker_id
 * @property string                           $type        One of the DocumentType enum values.
 * @property string                           $file_path   Relative path within the storage disk.
 * @property \Illuminate\Support\Carbon|null  $verified_at
 * @property \Illuminate\Support\Carbon|null  $created_at
 * @property \Illuminate\Support\Carbon|null  $updated_at
 *
 * @package App\Models
 */
class Document extends Model
{
    use HasFactory, HasHashid;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'worker_id',
        'type',
        'file_path',
        'verified_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'verified_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    /**
     * Get the worker that owns this document.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }

    /**
     * Get the assignment associated with this document (nullable).
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function assignment()
    {
        return $this->belongsTo(Assignment::class);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Returns a human-readable Indonesian label for this document's type.
     * Falls back to the raw type value if the Enum case is not found.
     *
     * @return string
     */
    public function getTypeLabel(): string
    {
        $enum = DocumentType::tryFrom($this->type);

        return $enum ? $enum->label() : $this->type;
    }

    /**
     * Determines whether this document has been verified.
     *
     * @return bool
     */
    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }
}
