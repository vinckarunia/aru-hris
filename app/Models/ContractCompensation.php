<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Contract;

/**
 * Class ContractCompensation
 *
 * Represents the financial compensation details (salary, allowances) for a specific contract.
 *
 * @property int $id
 * @property int $contract_id
 * @property string $base_salary
 * @property string $salary_rate
 * @property string $meal_allowance
 * @property string $transport_allowance
 * @property string $allowance
 * @property string $attendance_allowance
 * @property string $performance_bonus
 * @property string $allowance_rate
 * @property string $overtime_weekday_rate
 * @property string $overtime_holiday_rate
 * @property string $overtime_rate
 */
class ContractCompensation extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'contract_compensation';

    protected $fillable = [
        'contract_id',
        'base_salary',
        'salary_rate',
        'meal_allowance',
        'transport_allowance',
        'allowance',
        'attendance_allowance',
        'performance_bonus',
        'allowance_rate',
        'overtime_weekday_rate',
        'overtime_holiday_rate',
        'overtime_rate',
    ];

    /**
     * Default null numeric compensation fields to 0 before insertion.
     */
    protected static function booted(): void
    {
        static::creating(function (ContractCompensation $comp) {
            $numericFields = [
                'base_salary', 'meal_allowance', 'transport_allowance',
                'allowance', 'attendance_allowance', 'performance_bonus',
                'overtime_weekday_rate', 'overtime_holiday_rate',
            ];
            foreach ($numericFields as $field) {
                if (is_null($comp->{$field})) {
                    $comp->{$field} = 0;
                }
            }
        });
    }

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }
}
