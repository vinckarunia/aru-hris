<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBulkImport;
use App\Models\Project;
use App\Services\ImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use App\Models\Client;

/**
 * Class ImportController
 *
 * Handles the Import Supertool wizard workflow: file upload, column mapping
 * with global settings, validation preview, background processing, and result
 * download. All import sessions are tracked via Redis for real-time progress.
 *
 * Replaces the legacy BulkImportController with a comprehensive multi-module
 * import pipeline supporting Workers, Assignments, Contracts, Compensations,
 * and Family Members.
 *
 * @package App\Http\Controllers
 */
class ImportController extends Controller
{
    /**
     * @var ImportService
     */
    private ImportService $importService;

    /**
     * Create a new controller instance.
     *
     * @param ImportService $importService The injected import service.
     */
    public function __construct(ImportService $importService)
    {
        $this->importService = $importService;
    }

    /**
     * Render the import wizard page.
     *
     * Passes the available database columns for mapping and projects
     * with their branches for the global settings dropdowns.
     *
     * @return Response
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        $clientsQuery = Client::orderBy('full_name');
        $projectsQuery = Project::with('branches')->orderBy('name');
        
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $clientsQuery->whereHas('projects', function($q) use ($projectIds) {
                $q->whereIn('projects.id', $projectIds);
            });
            $projectsQuery->whereIn('id', $projectIds);
        }

        $clients = $clientsQuery->get();
        $projects = $projectsQuery->get();

        return Inertia::render('Worker/Import', [
            'clients' => $clients,
            'projects' => $projects,
            'dbColumns' => ImportService::DB_COLUMNS,
        ]);
    }

    /**
     * Return projects with their associated branches for cascading dropdowns.
     *
     * @return JsonResponse
     */
    public function globalOptions(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $clientsQuery = Client::orderBy('full_name');
        $projectsQuery = Project::with('branches')->orderBy('name');
        
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $clientsQuery->whereHas('projects', function($q) use ($projectIds) {
                $q->whereIn('projects.id', $projectIds);
            });
            $projectsQuery->whereIn('id', $projectIds);
        }

        $clients = $clientsQuery->get();
        $projects = $projectsQuery->get();

        return response()->json([
            'clients' => $clients,
            'projects' => $projects,
        ]);
    }

    /**
     * Handle file upload, parse it, cache metadata in Redis, and return
     * headers, preview data, total row count, and auto-mapping suggestions.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function upload(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => ['required', 'file', 'max:10240', function ($attribute, $value, $fail) {
                $ext = strtolower($value->getClientOriginalExtension());
                if (!in_array($ext, ['csv', 'txt', 'xlsx', 'xls'])) {
                    $fail('File harus berformat CSV (.csv) atau Excel (.xlsx, .xls).');
                }
            }],
        ], [
            'file.required' => 'File wajib diunggah.',
            'file.max' => 'Ukuran file maksimal 10MB.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sessionId = Str::uuid()->toString();
        $file = $request->file('file');

        try {
            $result = $this->importService->parseAndCacheUpload($file, $sessionId);

            return response()->json([
                'message' => 'File berhasil diunggah dan siap untuk mapping.',
                'session_id' => $sessionId,
                'sheets' => $result['sheets'],
                'auto_mapping' => $result['auto_mapping'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal membaca file. Pastikan format file valid.',
            ], 500);
        }
    }

    /**
     * Validate all rows in the uploaded using the provided column mapping
     * and global settings. Returns per-row validation results with error details.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function validateImport(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_id' => ['required', 'string'],
            'mapping' => ['required', 'array'],
            'global_settings' => ['required', 'array'],
            'global_settings.client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'global_settings.project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'global_settings.branch_id'    => ['nullable', 'integer', 'exists:branches,id'],
            'header_row' => ['nullable', 'integer', 'min:1'],
            'active_sheet_name' => ['nullable', 'string'],
        ], [
            'session_id.required' => 'Session ID tidak ditemukan.',
            'mapping.required' => 'Mapping kolom wajib diisi.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sessionId = $request->input('session_id');
        $mapping = $request->input('mapping');
        $globalSettings = $request->input('global_settings');

        // Verify session exists in Redis
        $cached = $this->importService->getCachedSession($sessionId);
        if (!$cached) {
            return response()->json([
                'message' => 'Sesi import telah kedaluwarsa. Silakan upload ulang file.',
            ], 404);
        }

        try {
            $headerRow = (int) $request->input('header_row', 1);
            $activeSheetName = $request->input('active_sheet_name');
            $result = $this->importService->validateAllRows($sessionId, $mapping, $globalSettings, $headerRow, $activeSheetName);

            return response()->json([
                'message' => 'Validasi selesai.',
                'summary' => $result['summary'],
                'results' => $result['results'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan saat validasi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dispatch the background import job to process all validated rows.
     *
     * The job processes rows using Redis queue, updates progress in real-time,
     * and generates a failed rows for re-import if needed.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function process(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_id' => ['required', 'string'],
            'mapping' => ['required', 'array'],
            'global_settings' => ['required', 'array'],
            'row_actions' => ['nullable', 'array'],
            'header_row' => ['nullable', 'integer', 'min:1'],
            'active_sheet_name' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sessionId = $request->input('session_id');
        $mapping = $request->input('mapping');
        $globalSettings = $request->input('global_settings');
        $rowActions = $request->input('row_actions', []);

        // Verify session exists
        $cached = $this->importService->getCachedSession($sessionId);
        if (!$cached) {
            return response()->json([
                'message' => 'Sesi import telah kedaluwarsa. Silakan upload ulang file.',
            ], 404);
        }

        // Initialize progress
        $this->importService->updateProgress($sessionId, 0, $cached['total_rows'], 0, 'processing');

        // Dispatch job to queue
        $headerRow = (int) $request->input('header_row', 1);
        $activeSheetName = $request->input('active_sheet_name');
        ProcessBulkImport::dispatch($sessionId, $mapping, $globalSettings, auth()->id(), $rowActions, $headerRow, $activeSheetName);

        // Auto-start queue worker in background (stops when empty)
        $artisan = base_path('artisan');
        exec("php {$artisan} queue:work --stop-when-empty --timeout=300 > /dev/null 2>&1 &");

        return response()->json([
            'message' => 'Proses import telah dimulai di background.',
            'session_id' => $sessionId,
        ]);
    }

    /**
     * Poll the current progress of an import session from Redis.
     *
     * @param string $sessionId The import session ID.
     * @return JsonResponse
     */
    public function progress(string $sessionId): JsonResponse
    {
        $progress = $this->importService->getProgress($sessionId);

        if (!$progress) {
            return response()->json([
                'message' => 'Data progress tidak ditemukan.',
            ], 404);
        }

        return response()->json($progress);
    }

    /**
     * Download the file containing rows that failed during import.
     *
     * The failed includes all original columns plus an ERROR_REASON column,
     * allowing users to fix the data and re-import through the same tool.
     *
     * @param string $sessionId The import session ID.
     * @return BinaryFileResponse|JsonResponse
     */
    public function downloadFailures(string $sessionId): BinaryFileResponse|JsonResponse
    {
        $progress = $this->importService->getProgress($sessionId);

        if (!$progress || empty($progress['failed_file_path'])) {
            return response()->json([
                'message' => 'File kegagalan import tidak ditemukan.',
            ], 404);
        }

        $fullPath = Storage::disk('local')->path($progress['failed_file_path']);

        if (!file_exists($fullPath)) {
            return response()->json([
                'message' => 'File kegagalan import sudah dihapus atau kedaluwarsa.',
            ], 404);
        }

        return response()->download($fullPath, 'import_gagal_' . date('Y-m-d_His') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Download the import template with all recommended column headers.
     *
     * @return BinaryFileResponse
     */
    public function downloadTemplate(): BinaryFileResponse
    {
        $path = $this->importService->generateTemplate();
        $fullPath = Storage::disk('local')->path($path);

        return response()->download($fullPath, 'template_import_karyawan.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
