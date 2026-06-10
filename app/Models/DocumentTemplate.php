<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Class DocumentTemplate
 *
 * Represents a document template that can be used globally or project-specifically.
 */
class DocumentTemplate extends Model
{
    use HasFactory, \App\Traits\HasHashid;

    public const TYPE_KONTRAK_PKWT = 'kontrak_pkwt';
    public const TYPE_KONTRAK_PART_TIME = 'kontrak_part_time';
    public const TYPE_KONTRAK_HARIAN = 'kontrak_harian';
    public const TYPE_SURAT_TUGAS = 'surat_tugas';
    public const TYPE_PAKLARING_A = 'paklaring_a';
    public const TYPE_PAKLARING_B = 'paklaring_b';

    protected $fillable = [
        'project_id',
        'name',
        'type',
        'file_path',
        'content_html',
        'view_path',
        'is_active',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_default' => 'boolean',
        ];
    }

    /**
     * Get the project that owns the custom template (if any).
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
