<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Project;
use App\Models\Branch;
use App\Models\Worker;
use App\Models\Contract;
use App\Models\ContractCompensation;
use App\Models\Document;

/**
 * Class Assignment
 *
 * Represents a worker's active or past assignment to a specific project and branch.
 *
 * @property int $id
 * @property int $worker_id Foreign key to workers table
 * @property int $project_id Foreign key to projects table
 * @property int $branch_id Foreign key to branches table
 * @property string|null $employee_id Client's internal employee ID
 * @property string|null $position Job position/title
 * @property string $hire_date Date when the assignment started
 * @property string|null $termination_date Date when the assignment ended
 * @property string|null $status Current status of the assignment (active, resign, etc.)
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Assignment extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'assignments';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'worker_id',
        'project_id',
        'branch_id',
        'employee_id',
        'position',
        'hire_date',
        'termination_date',
        'status',
    ];

    /**
     * Get the project associated with the assignment.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the specific branch within the project for this assignment.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the worker who owns the assignment.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }

    /**
     * Get the contracts associated with the assignment.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    /**
     * Get the contract compensations associated with the assignment through contracts.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasManyThrough
     */
    public function compensation()
    {
        return $this->hasManyThrough(ContractCompensation::class, Contract::class, 'assignment_id', 'contract_id', 'id', 'id');
    }

    /**
     * Get the documents associated with the assignment.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function documents()
    {
        return $this->hasMany(Document::class);
    }
}