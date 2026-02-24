<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Assignment;
use App\Models\FamilyMember;
use App\Models\Document;
use App\Models\User;
use App\Models\Contract;
use App\Models\ContractCompensation;

class Worker extends Model
{
    use HasFactory;

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }

    public function familyMembers()
    {
        return $this->hasMany(FamilyMember::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }


    public function contracts()
    {
        return $this->hasManyThrough(Contract::class, Assignment::class, 'worker_id', 'assignment_id', 'id', 'id');
    }

    public function compensation()
    {
        return $this->hasManyThrough(ContractCompensation::class, Contract::class, 'assignment_id', 'contract_id', 'id', 'id');
    }
}
