<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Worker;

class FamilyMember extends Model
{
    use HasFactory;

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }
}
