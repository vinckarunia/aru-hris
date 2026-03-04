<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Client;
use App\Models\Department;
use App\Models\Assignment;

/**
 * Class Project
 *
 * Represents a project assigned to a specific department of a client.
 *
 * @property int $id
 * @property int $client_id Foreign key referencing the clients table.
 * @property int $department_id Foreign key referencing the departments table.
 * @property string $name The name of the project.
 * @property string $prefix The prefix used for generating worker IDs within this project.
 * @property int $id_running_number The auto-incrementing number for worker ID generation.
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Project extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'client_id',
        'name',
        'prefix',
        'id_running_number',
    ];

    /**
     * Get the client that owns the project.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the departments that are associated with the project.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function departments()
    {
        return $this->belongsToMany(Department::class);
    }

    /**
     * Get the assignments associated with the project.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }
}