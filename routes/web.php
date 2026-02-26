<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\WorkerController;
use App\Http\Controllers\BulkImportController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Client Routes
    Route::resource('clients', ClientController::class)->except(['create', 'edit']);
    Route::resource('departments', DepartmentController::class)->except(['index', 'create', 'show', 'edit']);

    // Project Routes
    Route::resource('projects', ProjectController::class)->except(['create', 'show', 'edit']);

    // Worker Routes
    Route::resource('workers', WorkerController::class);
    Route::post('/import/workers/preview', [BulkImportController::class, 'preview'])->name('import.workers.preview');
    Route::post('/import/workers/process', [BulkImportController::class, 'process'])->name('import.workers.process');
    Route::get('/import/workers', function () {
        return Inertia::render('Worker/BulkImport');
    })->name('import.workers.view');
});

require __DIR__.'/auth.php';
