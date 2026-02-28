<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\WorkerController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\FamilyMemberController;
use App\Http\Controllers\ImportController;
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
    Route::resource('projects', ProjectController::class)->except(['create', 'edit']);

    // Worker Import Routes (must be declared BEFORE the resource route
    // to prevent 'workers/{worker}' from matching 'workers/import')
    Route::prefix('workers/import')->name('workers.import.')->group(function () {
        Route::get('/', [ImportController::class, 'index'])->name('index');
        Route::get('/global-options', [ImportController::class, 'globalOptions'])->name('global-options');
        Route::get('/template', [ImportController::class, 'downloadTemplate'])->name('template');
        Route::post('/upload', [ImportController::class, 'upload'])->name('upload');
        Route::post('/validate', [ImportController::class, 'validateImport'])->name('validate');
        Route::post('/process', [ImportController::class, 'process'])->name('process');
        Route::get('/progress/{sessionId}', [ImportController::class, 'progress'])->name('progress');
        Route::get('/download-failures/{sessionId}', [ImportController::class, 'downloadFailures'])->name('download-failures');
    });

    // Worker CRUD Routes
    Route::resource('workers', WorkerController::class);
    Route::resource('family-members', App\Http\Controllers\FamilyMemberController::class)->except(['index']);

    // Assignment and Contract Routes
    Route::resource('assignments', App\Http\Controllers\AssignmentController::class)->except(['index']);
    Route::resource('contracts', App\Http\Controllers\ContractController::class)->except(['index']);
});

require __DIR__.'/auth.php';
