<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Worker;

/**
 * Class FamilyMember
 * * Represents a family member associated with a worker in the HRIS.
 *
 * @package App\Models
 * @property int $id
 * @property int $worker_id
 * @property string $relationship_type 'spouse', 'child', 'parent', 'other relatives'
 * @property string $name
 * @property string|null $birth_place
 * @property string|null $birth_date
 * @property string|null $nik
 * @property string|null $bpjs_number
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Worker $worker
 */
class FamilyMember extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'worker_id',
        'relationship_type',
        'name',
        'birth_place',
        'birth_date',
        'nik',
        'bpjs_number',
    ];

    /**
     * Get the worker that owns the family member record.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }
}