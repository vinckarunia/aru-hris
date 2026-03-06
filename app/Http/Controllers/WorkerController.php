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
                return redirect()->route('workers.show', $user->worker_id);
            }
            abort(403, 'Akses ditolak.');
        }

        // Process distinct clients for the filter dropdown
        $clients = \App\Models\Client::select('id', 'full_name')
            ->orderBy('full_name')
            ->with('projects:id,client_id,name')
            ->get();

        $query = Worker::with(['assignments' => function ($query) {
            $query->whereIn('status', ['active', 'probation', 'extended'])
                  ->orderBy('hire_date', 'desc')
                  ->with([
                      'project:id,name',
                      'branch:id,name',
                      'contracts' => fn ($q) => $q->orderBy('start_date', 'desc'),
                  ]);
        }]);

        // Jika PIC, filter karyawan yang ada di project yang dihandle PIC
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $query->whereHas('assignments', function ($q) use ($projectIds) {
                $q->whereIn('status', ['active', 'probation', 'extended'])
                  ->whereIn('project_id', $projectIds);
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

        return Inertia::render('Worker/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->isWorker()) abort(403);
        $validated = $request->validate($this->getValidationRules(), $this->getValidationMessages());

        Worker::create($validated);

        return redirect()->route('workers.index')->with('message', 'Karyawan berhasil ditambahkan.');
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

        $worker->load(['assignments.project', 'assignments.branch', 'assignments.contracts', 'familyMembers']);
        return Inertia::render('Worker/Show', ['worker' => $worker]);
    }

    /**
     * Show the form for editing the specified worker.
     *
     * @param Worker
     * @return Response
     */
    public function edit(Request $request, Worker $worker): Response
    {
        if ($request->user()->isWorker()) abort(403);
        return Inertia::render('Worker/Edit', ['worker' => $worker]);
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
        if ($request->user()->isWorker()) abort(403);
        $validated = $request->validate($this->getValidationRules($worker->id), $this->getValidationMessages());

        $worker->update($validated);

        return redirect()->route('workers.show', $worker->id)->with('message', 'Data karyawan berhasil diperbarui.');
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

        $worker->delete();
        return redirect()->route('workers.index')->with('message', 'Karyawan berhasil dihapus.');
    }

    /**
     * Define the strict validation rules for Indonesian identity numbers.
     * 
     * @param int|null $workerId Optional worker ID to ignore for unique checks during updates.
     * @return array
     */
    private function getValidationRules(?int $workerId = null): array
    {
        return [
            'nik_aru' => ['nullable', 'string', 'max:50', Rule::unique('workers')->ignore($workerId)],
            'name' => 'required|string|max:255',
            'ktp_number' => ['required', 'digits:16', Rule::unique('workers')->ignore($workerId)],
            'kk_number' => 'nullable|digits:16',
            'birth_place' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|in:male,female',
            'phone' => 'nullable|string|max:50',
            'education' => 'nullable|string|max:100',
            'religion' => 'nullable|string|max:50',
            'tax_status' => 'nullable|string|max:50',
            'address_ktp' => 'nullable|string',
            'address_domicile' => 'nullable|string',
            'mother_name' => 'nullable|string|max:255',
            'npwp' => 'nullable|regex:/^[0-9]{15,16}$/',
            'bpjs_kesehatan' => 'nullable|digits:13',
            'bpjs_ketenagakerjaan' => 'nullable|digits:11',
            'bank_name' => 'nullable|string|max:100',
            'bank_account_number' => 'nullable|string|max:100',
        ];
    }

    /**
     * Custom error messages for digit validations.
     * 
     * @return array
     */
    private function getValidationMessages(): array
    {
        return [
            'ktp_number.digits' => 'Nomor KTP (NIK) harus terdiri dari tepat 16 digit angka.',
            'kk_number.digits' => 'Nomor Kartu Keluarga (KK) harus terdiri dari tepat 16 digit angka.',
            'npwp.regex' => 'Nomor NPWP harus terdiri dari 15 atau 16 digit angka.',
            'bpjs_kesehatan.digits' => 'Nomor BPJS Kesehatan harus terdiri dari tepat 13 digit angka.',
            'bpjs_ketenagakerjaan.digits' => 'Nomor BPJS Ketenagakerjaan harus terdiri dari tepat 11 digit angka.',
        ];
    }
}