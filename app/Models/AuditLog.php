<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class AuditLog
 *
 * Records all significant user actions across the HRIS for accountability and traceability.
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $action
 * @property string $module
 * @property string $description
 * @property array|null $metadata
 * @property string|null $ip_address
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 */
class AuditLog extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'module',
        'description',
        'metadata',
        'ip_address',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    /**
     * Get the user that performed the action.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Log an audit event.
     *
     * @param string $action The action performed (e.g., 'create', 'update', 'delete').
     * @param string $module The module/entity affected (e.g., 'worker', 'contract').
     * @param string $description Human-readable description of the event.
     * @param array|null $metadata Optional old/new values or extra context.
     * @param int|null $userId Optional specific user ID instead of auth()->id()
     * @return static
     */
    public static function log(string $action, string $module, string $description, ?array $metadata = null, ?int $userId = null): static
    {
        return static::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'module' => $module,
            'description' => $description,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
        ]);
    }
}
