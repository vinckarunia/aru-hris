<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoogleOAuthCredential extends Model
{
    protected $table = 'google_oauth_credentials';

    protected $fillable = [
        'refresh_token',
        'connected_at',
        'refresh_token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'refresh_token' => 'encrypted',
            'connected_at' => 'datetime',
            'refresh_token_expires_at' => 'datetime',
        ];
    }
}
