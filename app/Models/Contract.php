<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Assignment;
use App\Models\ContractCompensation;

/**
 * Class Contract
 *
 * Represents a worker's employment contract within a specific assignment.
 *
 * @property int $id
 * @property int $assignment_id
 * @property string $contract_type (Kontrak|Harian)
 * @property string|null $pkwt_type (PKWT|PKWTT)
 * @property int $pkwt_number
 * @property string $start_date
 * @property string|null $end_date
 * @property int|null $duration_months
 * @property string|null $evaluation_notes
 * @property string|null $file_path
 */
class Contract extends Model
{
    use HasFactory, \App\Traits\HasHashid;

    protected $fillable = [
        'assignment_id',
        'contract_type',
        'pkwt_type',
        'pkwt_number',
        'start_date',
        'end_date',
        'duration_months',
        'evaluation_notes',
        'file_path',
        'hardcopy_received_at',
        'hardcopy_received_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'hardcopy_received_at' => 'datetime',
        ];
    }

    public function assignment()
    {
        return $this->belongsTo(Assignment::class);
    }

    public function compensation()
    {
        return $this->hasOne(ContractCompensation::class);
    }

    /**
     * Get the user who confirmed hardcopy receipt.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function hardcopyReceivedByUser()
    {
        return $this->belongsTo(\App\Models\User::class, 'hardcopy_received_by');
    }
}