<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use App\Enums\UserRole;

/**
 * Class WorkerController
 *
 * Handles CRUD operations for the Worker module.
 */
class WorkerController extends Controller
{
    /**
     * Display a listing of the workers.
     *
     * @return Response
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // Worker hanya boleh melihat profilnya sendiri, tidak boleh akses index
        if ($user->isWorker()) {
            if ($user->worker_id) {
                return redirect()->route('workers.show', \App\Models\Worker::encodeHashid($user->worker_id));
            }
            abort(403, 'Akses ditolak.');
        }

        $clientsQuery = \App\Models\Client::select('id', 'full_name')->orderBy('full_name');
        
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $clientsQuery->whereHas('projects', function($q) use ($projectIds) {
                $q->whereIn('projects.id', $projectIds);
            })->with(['projects' => function($q) use ($projectIds) {
                $q->select('id', 'client_id', 'name')->whereIn('id', $projectIds);
            }]);
        } else {
            $clientsQuery->with('projects:id,client_id,name');
        }
        
        $clients = $clientsQuery->get();

        $query = Worker::with(['assignments' => function ($query) {
            $query->orderBy('hire_date', 'desc')
                  ->with([
                      'project' => fn($q) => $q->withTrashed()->select('id', 'name', 'deleted_at'),
                      'branches:id,name',
                      'contracts' => fn ($q) => $q->orderBy('start_date', 'desc'),
                  ]);
        }]);

        // Jika PIC, filter karyawan yang ada di project yang dihandle PIC
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $query->whereHas('assignments', function ($q) use ($projectIds) {
                $q->whereIn('project_id', $projectIds);
            });
        }

        $workers = $query->latest()->get();

        return Inertia::render('Worker/Index', [
            'workers' => $workers,
            'clients' => $clients,
        ]);
    }

    /**
     * Show the form for creating a new worker.
     *
     * @return Response
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()->isWorker()) abort(403);

        $picProjects = [];
        if ($request->user()->isPic()) {
            $picProjects = $request->user()->pic ? $request->user()->pic->projects()->with('branches:id,client_id,name')->select('projects.id', 'name', 'client_id', 'prefix')->get() : [];
        }

        return Inertia::render('Worker/Create', [
            'picProjects' => $picProjects,
            'validationDigits' => SettingController::getValidationDigits(),
            'validationEnums' => SettingController::getValidationEnums(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);

        $validated = $request->validate($this->getValidationRules(), $this->getValidationMessages());

        if ($user->isPic()) {
            $request->validate(['project_id' => 'required|exists:projects,id']);
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($request->project_id, $projectIds)) abort(403);

            // Merge assignment detail fields into the payload
            $payload = $validated;
            if ($request->filled('position')) {
                $payload['position'] = $request->position;
            }
            if ($request->filled('branch_ids')) {
                $payload['branch_ids'] = $request->branch_ids;
            }
            if ($request->filled('hire_date')) {
                $payload['hire_date'] = $request->hire_date;
            }
            if ($request->filled('employee_id')) {
                $payload['employee_id'] = $request->employee_id;
            }

            // Validate and bundle contract+compensation data
            $contractData = $request->validate([
                'contract_type'    => 'required|in:Kontrak,Harian,Part-time',
                'pkwt_type'        => 'nullable|in:PKWT,PKWTT',
                'pkwt_number'      => 'nullable|integer|min:1',
                'start_date'       => 'nullable|date',
                'end_date'         => 'nullable|date|after_or_equal:start_date',
                'duration_months'  => 'nullable|integer|min:1',
                'evaluation_notes' => 'nullable|string',
                'base_salary'      => 'required|numeric|min:0',
                'salary_rate'      => 'required|in:hourly,daily,monthly,yearly',
                'meal_allowance'   => 'nullable|numeric|min:0',
                'transport_allowance' => 'nullable|numeric|min:0',
                'allowance'        => 'nullable|numeric|min:0',
                'attendance_allowance' => 'nullable|numeric|min:0',
                'performance_bonus' => 'nullable|numeric|min:0',
                'allowance_rate'   => 'nullable|in:hourly,daily,monthly,yearly',
                'overtime_weekday_rate' => 'nullable|numeric|min:0',
                'overtime_holiday_rate' => 'nullable|numeric|min:0',
                'overtime_rate'    => 'nullable|in:hourly,daily,monthly,yearly',
            ]);

            $payload['_contract'] = $contractData;

            \App\Models\DataRequest::create([
                'worker_id' => null,
                'project_id' => $request->project_id,
                'requested_by' => $user->id,
                'request_type' => 'new_data',
                'requested_fields' => array_keys($payload),
                'requested_data' => $payload,
                'notes' => 'Registrasi Karyawan Baru + Penempatan + Kontrak oleh PIC',
                'status' => 'pending',
                'pic_status' => 'approved', // Auto-approve for the PIC tier
                'pic_reviewed_by' => $user->id,
                'pic_reviewed_at' => now(),
            ]);

            return redirect()->route('data-requests.index')
                             ->with('message', 'Pengajuan karyawan baru beserta penempatan dan kontrak berhasil dikirim ke Admin.');
        }

        $worker = Worker::create($validated);

        \App\Models\AuditLog::log('create', 'worker', "Menambahkan karyawan: {$worker->name}", ['worker_id' => $worker->id]);

        return redirect()->route('assignments.create', ['worker_id' => $worker->id])
                         ->with('message', 'Karyawan berhasil ditambahkan. Silahkan lengkapi penempatan project.');
    }

    /**
     * Display the specified worker along with their assignments and related project/branch details.
     *
     * @param Worker
     * @return Response
     */
    public function show(Request $request, Worker $worker): Response
    {
        $user = $request->user();

        // Worker hanya boleh melihat data dirinya sendiri
        if ($user->isWorker() && $user->worker_id !== $worker->id) {
            abort(403, 'Akses ditolak.');
        }

        // PIC hanya boleh melihat data karyawan di projectnya
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            $hasActiveAssignmentInPicProject = $worker->assignments()->whereIn('status', ['active', 'probation', 'extended'])
                ->whereIn('project_id', $projectIds)->exists();
            if (!$hasActiveAssignmentInPicProject) {
                // abort(403, 'Akses ditolak. Karyawan ini tidak berada di project Anda.');
            }
        }

        $worker->load([
            'assignments' => function($q) {
                $q->orderBy('hire_date', 'desc')->orderBy('id', 'desc');
            },
            'assignments.project',
            'assignments.branches',
            'assignments.contracts' => function($q) {
                $q->orderBy('start_date', 'desc')->orderBy('id', 'desc');
            },
            'familyMembers',
            'documents'
        ]);

        // Load document settings for the frontend (active types, max size, allowed formats)
        $docTypesJson = \App\Models\Setting::where('key', 'document_types')->value('value');
        if ($docTypesJson) {
            $documentTypes = json_decode($docTypesJson, true) ?? [];
        } else {
            // Default seed from DocumentType Enum
            $documentTypes = collect(\App\Enums\DocumentType::cases())->map(fn($c) => [
                'value'   => $c->value,
                'label'   => $c->label(),
                'enabled' => true,
            ])->values()->all();
        }

        $docMaxKb    = (int) (\App\Models\Setting::where('key', 'document_max_size_kb')->value('value') ?? 5120);
        $docMimes    = \App\Models\Setting::where('key', 'document_allowed_mimes')->value('value') ?? 'pdf,jpg,jpeg,png';

        return Inertia::render('Worker/Show', [
            'worker'           => $worker,
            'documentTypes'    => $documentTypes,
            'documentSettings' => [
                'max_size_kb'    => $docMaxKb,
                'allowed_mimes'  => $docMimes,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified worker.
     *
     * @param Worker
     * @return Response
     */
    public function edit(Request $request, Worker $worker): Response
    {
        if ($request->user()->isWorker() || $request->user()->isPic()) abort(403, 'Akses ditolak. Silahkan gunakan fitur Ajukan Perubahan Data.');
        return Inertia::render('Worker/Edit', [
        'worker' => $worker,
        'validationDigits' => SettingController::getValidationDigits(),
        'validationEnums' => SettingController::getValidationEnums(),
    ]);
    }

    /**
     * Update the specified worker in storage.
     *
     * @param Request $request
     * @param Worker $worker
     * @return RedirectResponse
     */
    public function update(Request $request, Worker $worker): RedirectResponse
    {
        if ($request->user()->isWorker() || $request->user()->isPic()) abort(403, 'Akses ditolak. Silahkan gunakan fitur Ajukan Perubahan Data.');
        $validated = $request->validate($this->getValidationRules($worker->id), $this->getValidationMessages());

        $oldData = $worker->getOriginal();
        $worker->update($validated);

        \App\Models\AuditLog::log('update', 'worker', "Memperbarui data karyawan: {$worker->name}", ['worker_id' => $worker->id, 'changes' => $worker->getChanges()]);

        return redirect()->route('workers.show', $worker)->with('message', 'Data karyawan berhasil diperbarui.');
    }

    /**
     * Remove the specified worker from storage.
     *
     * @param Worker
     * @return RedirectResponse
     */
    public function destroy(Request $request, Worker $worker): RedirectResponse
    {
        if ($request->user()->isWorker() || $request->user()->isPic()) {
            // PIC dan Worker tidak bisa hapus worker (opsional PIC dibatasi)
            abort(403, 'Anda tidak memiliki akses untuk menghapus data karyawan.');
        }

        \App\Models\AuditLog::log('delete', 'worker', "Menghapus karyawan: {$worker->name}", ['worker_id' => $worker->id]);
        $worker->delete();
        return redirect()->route('workers.index')->with('message', 'Karyawan berhasil dihapus.');
    }

    /**
     * Define the strict validation rules for Indonesian identity numbers.
     * Digit lengths are loaded dynamically from system settings.
     * 
     * @param int|null $workerId Optional worker ID to ignore for unique checks during updates.
     * @return array
     */
    private function getValidationRules(?int $workerId = null): array
    {
        $digits = \App\Http\Controllers\SettingController::getValidationDigits();

        return [
            'nik_aru' => ['nullable', 'string', 'max:50', Rule::unique('workers')->ignore($workerId)],
            'name' => 'required|string|max:255',
            'ktp_number' => ['required', 'digits:' . $digits['ktp'], Rule::unique('workers')->ignore($workerId)],
            'kk_number' => 'nullable|digits:' . $digits['kk'],
            'birth_place' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|in:male,female',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'education' => 'nullable|string|max:100',
            'religion' => 'nullable|string|max:50',
            'tax_status' => 'nullable|string|max:50',
            'address_ktp' => 'nullable|string',
            'address_domicile' => 'nullable|string',
            'mother_name' => 'required|string|max:255',
            'npwp' => 'nullable|digits:' . $digits['npwp'],
            'bpjs_kesehatan' => 'nullable|digits:' . $digits['bpjs_kes'],
            'bpjs_ketenagakerjaan' => 'nullable|digits:' . $digits['bpjs_tk'],
            'bank_name' => 'nullable|string|max:100',
            'bank_account_number' => 'nullable|string|max:100',
        ];
    }

    /**
     * Custom error messages for digit validations.
     * Messages are generated dynamically based on configured digit lengths.
     * 
     * @return array
     */
    private function getValidationMessages(): array
    {
        $digits = \App\Http\Controllers\SettingController::getValidationDigits();

        return [
            'ktp_number.digits' => 'Nomor KTP (NIK) harus terdiri dari tepat ' . $digits['ktp'] . ' digit angka.',
            'kk_number.digits' => 'Nomor Kartu Keluarga (KK) harus terdiri dari tepat ' . $digits['kk'] . ' digit angka.',
            'npwp.digits' => 'Nomor NPWP harus terdiri dari tepat ' . $digits['npwp'] . ' digit angka.',
            'bpjs_kesehatan.digits' => 'Nomor BPJS Kesehatan harus terdiri dari tepat ' . $digits['bpjs_kes'] . ' digit angka.',
            'bpjs_ketenagakerjaan.digits' => 'Nomor BPJS Ketenagakerjaan harus terdiri dari tepat ' . $digits['bpjs_tk'] . ' digit angka.',
        ];
    }
}