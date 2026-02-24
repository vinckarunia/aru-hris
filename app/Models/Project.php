<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Client;
use App\Models\Department;
use App\Models\Assignment;

class Project extends Model
{
    use HasFactory;

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }
}
