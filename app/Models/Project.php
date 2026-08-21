<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
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
    use HasFactory, SoftDeletes, \App\Traits\HasHashid;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'client_id',
        'name',
        'pkwt_type',
        'prefix',
        'id_running_number',
        'template_kontrak_id',
        'template_harian_id',
        'template_part_time_id',
        'template_mitra_id',
        'template_surat_tugas_id',
        'template_paklaring_a_id',
        'template_paklaring_b_id',
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

    // --- Document Template Relationships ---

    public function templateKontrak()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_kontrak_id');
    }

    public function templateHarian()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_harian_id');
    }

    public function templatePartTime()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_part_time_id');
    }

    public function templateMitra()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_mitra_id');
    }

    public function templateSuratTugas()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_surat_tugas_id');
    }

    public function templatePaklaringA()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_paklaring_a_id');
    }

    public function templatePaklaringB()
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_paklaring_b_id');
    }
}
