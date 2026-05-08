<?php

use App\Enums\UserRole;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\WorkerController;
use App\Http\Controllers\WorkerExportController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\FamilyMemberController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\PicController;
use App\Http\Controllers\DataRequestController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\InternalEmployeeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    return match (auth()->user()->role) {
        UserRole::SUPER_ADMIN, UserRole::ADMIN_ARU => redirect()->route('dashboard'),
        UserRole::PIC                              => redirect()->route('dashboard'),
        UserRole::WORKER                           => redirect()->route('workers.index'),
        default                                    => redirect()->route('login'),
    };
});

// Akses terbatas PIC, ARU dan super admin yang boleh melihat dashboard
Route::middleware(['auth', 'verified', 'role:SUPER_ADMIN,ADMIN_ARU,PIC'])->group(function () {
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

    // Worker CRUD and Export Routes
    Route::get('workers/export', [WorkerExportController::class, 'export'])->name('workers.export');
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

    // Shared Routes: Admin + PIC
    Route::middleware(['role:SUPER_ADMIN,ADMIN_ARU,PIC'])->group(function () {
        Route::get('/reminders', [\App\Http\Controllers\ReminderController::class, 'index'])->name('reminders.index');
        Route::post('/reminders/{reminder}/dismiss', [\App\Http\Controllers\ReminderController::class, 'dismiss'])->name('reminders.dismiss');
        Route::post('/reminders/{reminder}/restore', [\App\Http\Controllers\ReminderController::class, 'restore'])->name('reminders.restore');
        Route::post('/reminders/process', [\App\Http\Controllers\ReminderController::class, 'process'])->name('reminders.process');

        // Document Generation
        Route::get('/contracts/{contract}/download-pkwt', [\App\Http\Controllers\ContractDocumentController::class, 'downloadPkwt'])->name('contracts.download-pkwt');
        Route::get('/contracts/{contract}/download-st', [\App\Http\Controllers\ContractDocumentController::class, 'downloadSuratTugas'])->name('contracts.download-st');
    });

    // Admin & Super Admin Routes
    Route::middleware(['role:SUPER_ADMIN,ADMIN_ARU'])->group(function () {
        Route::resource('pics', PicController::class)->except(['create', 'show', 'edit']);
        Route::prefix('internal-employees/import')->name('internal-employees.import.')->group(function () {
            Route::get('/', [InternalEmployeeController::class, 'importIndex'])->name('index');
            Route::get('/template', [InternalEmployeeController::class, 'downloadTemplate'])->name('template');
            Route::post('/upload', [InternalEmployeeController::class, 'upload'])->name('upload');
            Route::post('/validate', [InternalEmployeeController::class, 'validateImport'])->name('validate');
            Route::post('/process', [InternalEmployeeController::class, 'process'])->name('process');
            Route::get('/progress/{sessionId}', [InternalEmployeeController::class, 'progress'])->name('progress');
        });
        Route::get('internal-employees/export', [InternalEmployeeController::class, 'export'])->name('internal-employees.export');
        Route::resource('internal-employees', InternalEmployeeController::class);
        
        // System Settings
        Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\SettingController::class, 'update'])->name('settings.update');
        Route::post('/settings/upload-asset', [\App\Http\Controllers\SettingController::class, 'uploadAsset'])->name('settings.upload-asset');
        Route::post('/settings/reset-data', [\App\Http\Controllers\SettingController::class, 'resetData'])->name('settings.reset-data');
        Route::post('/settings/reset-system', [\App\Http\Controllers\SettingController::class, 'resetSystem'])->name('settings.reset-system');

        Route::get('/audit-logs', [\App\Http\Controllers\AuditLogController::class, 'index'])->name('audit-logs.index');


        // Reports (Query Builder)
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::post('/reports/preview', [ReportController::class, 'preview'])->name('reports.preview');
        Route::post('/reports/export', [ReportController::class, 'export'])->name('reports.export');
    });

    // Data Request Routes
    Route::get('/data-requests', [DataRequestController::class, 'index'])->name('data-requests.index');
    Route::get('/data-requests/create', [DataRequestController::class, 'create'])->name('data-requests.create');
    Route::post('/data-requests', [DataRequestController::class, 'store'])->name('data-requests.store');
    Route::put('/data-requests/{dataRequest}/review', [DataRequestController::class, 'review'])->name('data-requests.review');
    Route::post('/data-requests/bulk-review', [DataRequestController::class, 'bulkReview'])->name('data-requests.bulk-review');
});

require __DIR__.'/auth.php';
