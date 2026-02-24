<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Worker;
use App\Models\Assignment;

class Document extends Model
{
    use HasFactory;

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }

    public function assignment()
    {
        return $this->belongsTo(Assignment::class);
    }
}
