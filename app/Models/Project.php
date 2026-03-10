<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Client;
use App\Models\Branch;
use App\Models\Assignment;
use App\Models\Pic;

/**
 * Class Project
 *
 * Represents a project assigned to a specific branch of a client.
 *
 * @property int $id
 * @property int $client_id Foreign key referencing the clients table.
 * @property string $name The name of the project.
 * @property string $prefix The prefix used for generating worker IDs within this project.
 * @property int $id_running_number The auto-incrementing number for worker ID generation.
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Project extends Model
{
    use HasFactory, \App\Traits\HasHashid;

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
     * Get the branches (cabang) associated with the project.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'branch_project');
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

    /**
     * Get the PICs associated with the project.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function pics()
    {
        return $this->belongsToMany(Pic::class, 'pic_project');
    }
}