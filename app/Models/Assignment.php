<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Project;
use App\Models\Department;
use App\Models\Worker;
use App\Models\Contract;
use App\Models\ContractCompensation;
use App\Models\Document;

class Assignment extends Model
{
    use HasFactory;

    protected $table = 'assignments';

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function compensation()
    {
        return $this->hasManyThrough(ContractCompensation::class, Contract::class, 'assignment_id', 'contract_id', 'id', 'id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }
}
