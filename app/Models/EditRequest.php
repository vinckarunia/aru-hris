<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Worker;
use App\Models\Project;
use App\Models\User;

class EditRequest extends Model
{
    protected $fillable = [
        'worker_id',
        'project_id',
        'requested_by',
        'requested_fields',
        'notes',
        'status',
        'reviewed_by',
        'review_notes',
        'reviewed_at',
    ];

    protected $casts = [
        'requested_fields' => 'json',
        'reviewed_at' => 'datetime',
    ];

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
