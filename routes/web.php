<?php

use App\Enums\UserRole;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\WorkerController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\FamilyMemberController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\PicController;
use App\Http\Controllers\EditRequestController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    return match (auth()->user()->role) {
        UserRole::SUPER_ADMIN, UserRole::ADMIN_ARU => redirect()->route('dashboard'),
        UserRole::PIC                              => redirect()->route('projects.index'),
        UserRole::WORKER                           => redirect()->route('workers.index'),
        default                                    => redirect()->route('login'),
    };
});

// Akses terbatas hanya ARU dan super admin yang boleh melihat dashboard
Route::middleware(['auth', 'verified', 'role:SUPER_ADMIN,ADMIN_ARU'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Client Routes
    Route::resource('clients', ClientController::class)->except(['create', 'edit']);
    Route::resource('branches', BranchController::class)->except(['index', 'create', 'edit']);

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

    // Document Routes
    Route::post('/workers/{worker}/documents', [DocumentController::class, 'store'])->name('documents.store');
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');
    Route::get('/documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
    Route::put('/documents/{document}/verify', [DocumentController::class, 'verify'])->name('documents.verify');

    // Assignment and Contract Routes
    Route::resource('assignments', App\Http\Controllers\AssignmentController::class)->except(['index']);
    Route::resource('contracts', App\Http\Controllers\ContractController::class)->except(['index']);

    // Super Admin Only Routes
    Route::middleware(['role:SUPER_ADMIN'])->group(function () {
        Route::resource('users', UserManagementController::class)->except(['create', 'show', 'edit']);
    });

    // Admin & Super Admin Routes
    Route::middleware(['role:SUPER_ADMIN,ADMIN_ARU'])->group(function () {
        Route::resource('pics', PicController::class)->except(['create', 'show', 'edit']);
        
        // System Settings
        Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\SettingController::class, 'update'])->name('settings.update');
        Route::post('/settings/reset-data', [\App\Http\Controllers\SettingController::class, 'resetData'])->name('settings.reset-data');
        Route::post('/settings/reset-system', [\App\Http\Controllers\SettingController::class, 'resetSystem'])->name('settings.reset-system');
    });

    // Edit Request Routes
    Route::get('/edit-requests', [EditRequestController::class, 'index'])->name('edit-requests.index');
    Route::get('/edit-requests/create', [EditRequestController::class, 'create'])->name('edit-requests.create');
    Route::post('/edit-requests', [EditRequestController::class, 'store'])->name('edit-requests.store');
    Route::put('/edit-requests/{editRequest}/review', [EditRequestController::class, 'review'])->name('edit-requests.review');
});

require __DIR__.'/auth.php';
