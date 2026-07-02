<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InternalApiController;
use App\Http\Middleware\InternalApiAuth;
use App\Http\Middleware\DecodeHashids;

Route::middleware([
    InternalApiAuth::class,
    DecodeHashids::class,
])->prefix('internal')->group(function () {
    Route::get('/projects', [InternalApiController::class, 'getProjects']);
    Route::post('/data-requests', [InternalApiController::class, 'storeDataRequest']);
});
