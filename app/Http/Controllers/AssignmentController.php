<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Worker;
use App\Models\Project;
use App\Models\Branch; // Added
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException; // Added
// Removed: use Illuminate\Support\Facades\Validator;

/**
 * Class AssignmentController
 *
 * Handles CRUD operations for worker assignments to projects/branches.
 */
class AssignmentController extends Controller
{
    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403, 'Akses ditolak.');
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403, 'Akses ditolak.');

        $workerId = $request->query('worker_id');
        $request->validate(['worker_id' => 'required|exists:workers,id']);

        $worker = Worker::findOrFail($workerId);
        
        $projectsQuery = Project::with('branches')->orderBy('name');
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $projectsQuery->whereIn('id', $projectIds);
        }
        $projects = $projectsQuery->get();

        return Inertia::render('Assignment/Create', [
            'worker'   => $worker,
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403, 'Akses ditolak.');
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403, 'Akses ditolak.');

        try {
            // Validate assignment fields
            $validated = $request->validate([
                'worker_id'        => 'required|exists:workers,id',
                'project_id'       => 'required|exists:projects,id',
                'branch_ids'       => 'required|array|min:1',
                'branch_ids.*'     => 'exists:branches,id',
                'employee_id'      => [
                    'nullable', 'string', 'max:255',
                    Rule::unique('assignments')->where('project_id', $request->project_id),
                ],
                'position'         => 'nullable|string|max:255',
                'hire_date'        => 'nullable|date',
                'status'           => 'nullable|in:active,contract expired,resign,fired,project closed,other',
                'termination_date' => 'nullable|date|after_or_equal:hire_date',
            ], [
                'employee_id.unique' => 'ID Karyawan ini sudah digunakan di Project tersebut.',
            ]);

            // Validate bundled contract fields
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

            if (is_null($request->termination_date)) {
                $hasActive = Assignment::where('worker_id', $request->worker_id)
                    ->whereNull('termination_date')
                    ->exists();

                if ($hasActive) {
                    throw ValidationException::withMessages([
                        'termination_date' => 'Karyawan ini masih memiliki penempatan aktif. Harap untuk mengakhiri penempatan sebelumnya terlebih dahulu.'
                    ]);
                }
            }
        } catch (ValidationException $e) {
            return redirect()->back()->withErrors($e->errors())->withInput();
        }

        // PIC: route through DataRequest instead of direct DB write
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($request->project_id, $projectIds)) abort(403);

            \App\Models\DataRequest::create([
                'worker_id' => $validated['worker_id'],
                'project_id' => $validated['project_id'],
                'request_type' => 'status_change',
                'requested_by' => $user->id,
                'requested_fields' => array_keys($validated),
                'requested_data' => array_merge(
                    ['_action' => 'create_assignment'],
                    $validated,
                    ['_contract' => $contractData]
                ),
                'notes' => 'Penambahan Penempatan Baru + Kontrak Pertama oleh PIC',
                'status' => 'pending',
                'pic_status' => 'approved',
                'pic_reviewed_by' => $user->id,
                'pic_reviewed_at' => now(),
            ]);

            return redirect()->route('data-requests.index')
                ->with('message', 'Pengajuan penempatan baru beserta kontrak pertama berhasil dikirim ke Admin untuk direview.');
        }

        // Admin: create assignment + contract + compensation directly
        $branchIds = $validated['branch_ids'] ?? [];
        unset($validated['branch_ids']);
        $assignment = Assignment::create($validated);
        $assignment->branches()->sync($branchIds);

        \App\Models\AuditLog::log('create', 'assignment', "Menambahkan penempatan untuk worker #{$validated['worker_id']} ke project #{$validated['project_id']}", ['assignment_id' => $assignment->id]);

        // Generate a fresh NIK ARU based on the assigned project if not already filled.
        if (is_null($validated['termination_date'] ?? null)) {
            $worker  = Worker::find($validated['worker_id']);
            $project = Project::find($validated['project_id']);
            if (empty($worker->nik_aru)) {
                $newNik  = $this->generateNikForProject($project);
                $worker->update(['nik_aru' => $newNik]);
            }
        }

        // Create the bundled first contract
        $contractFields = array_intersect_key($contractData, array_flip((new \App\Models\Contract)->getFillable()));
        $contractFields['assignment_id'] = $assignment->id;
        $contract = \App\Models\Contract::create($contractFields);

        // Create compensation record
        $compFields = array_intersect_key($contractData, array_flip((new \App\Models\ContractCompensation)->getFillable()));
        $compFields['contract_id'] = $contract->id;
        \App\Models\ContractCompensation::create($compFields);

        return redirect()->route('assignments.show', $assignment)
            ->with('message', 'Penempatan dan kontrak pertama berhasil dibuat!');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Assignment $assignment): Response
    {
        $user = $request->user();
        $picProjects = [];

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Penempatan ini di luar wewenang project Anda.');
            }
            // Load projects with branches for the transfer form
            $picProjects = $user->pic ? $user->pic->projects()->with('branches:id,client_id,name')->select('projects.id', 'name')->get() : [];
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Wewenang untuk melihat detail teknis penempatan dan kontrak hanya ada pada Admin.');
        }

        $assignment->load(['worker', 'project', 'branches', 'contracts']);

        return Inertia::render('Assignment/Show', [
            'assignment' => $assignment,
            'picProjects' => $picProjects,
        ]);
    }

    /**
     * Show the form for editing the specified assignment.
     */
    public function edit(Request $request, Assignment $assignment): Response
    {
        $user = $request->user();

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Penempatan ini di luar wewenang project Anda.');
            }
            $projects = $user->pic ? $user->pic->projects()->with('branches')->orderBy('name')->get() : [];
        } elseif ($user->isAdminOrAbove()) {
            $projects = Project::with('branches')->orderBy('name')->get();
        } else {
            abort(403);
        }

        $assignment->load(['worker', 'branches']);

        return Inertia::render('Assignment/Edit', [
            'assignment' => $assignment,
            'projects'   => $projects,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Assignment $assignment): RedirectResponse
    {
        $user = $request->user();

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Penempatan ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403);
        }

        try {
            $rules = [
                'project_id'       => 'required|exists:projects,id',
                'branch_ids'       => 'required|array|min:1',
                'branch_ids.*'     => 'exists:branches,id',
                'employee_id'      => [
                    'nullable', 'string', 'max:255',
                    Rule::unique('assignments')->where('project_id', $request->project_id)->ignore($assignment->id),
                ],
                'position'         => 'nullable|string|max:255',
                'hire_date'        => 'nullable|date',
                'status'           => 'nullable|in:active,contract expired,resign,fired,project closed,other',
                'equipment_returned' => 'nullable|boolean',
                'termination_date' => 'nullable|date|after_or_equal:hire_date',
            ];

            if ($user->isPic()) {
                $rules['notes'] = 'required|string|max:1000';
            }

            $validated = $request->validate($rules);

            if ($user->isPic()) {
                $notes = $validated['notes'];
                unset($validated['notes']);
                
                \App\Models\DataRequest::create([
                    'worker_id' => $assignment->worker_id,
                    'project_id' => $assignment->project_id,
                    'request_type' => 'status_change',
                    'requested_by' => $user->id,
                    'requested_fields' => array_keys($validated),
                    'requested_data' => array_merge(['_action' => 'update_assignment', 'assignment_id' => $assignment->id], $validated),
                    'notes' => $notes,
                    'status' => 'pending',
                    'pic_status' => 'approved',
                    'pic_reviewed_by' => $user->id,
                    'pic_reviewed_at' => now(),
                ]);

                return redirect()->route('assignments.show', $assignment)
                    ->with('success', 'Pengajuan perubahan penempatan berhasil dikirim untuk direview Admin.');
            }

            if (is_null($request->termination_date)) {
                $hasActive = Assignment::where('worker_id', $assignment->worker_id)
                    ->where('id', '!=', $assignment->id)
                    ->whereNull('termination_date')
                    ->exists();

                if ($hasActive) {
                    throw ValidationException::withMessages([
                        'termination_date' => 'Karyawan ini memiliki penempatan aktif lain. Harap untuk mengakhiri penempatan lainnya terlebih dahulu.'
                    ]);
                }
            }
        } catch (ValidationException $e) {
            return redirect()->back()->withErrors($e->errors())->withInput();
        }

        $wasActive      = is_null($assignment->termination_date);
        $isNowActive    = is_null($validated['termination_date'] ?? null);
        $projectChanged = (int) $assignment->project_id !== (int) $validated['project_id'];

        $branchIds = $validated['branch_ids'] ?? [];
        unset($validated['branch_ids']);
        $assignment->update($validated);
        $assignment->branches()->sync($branchIds);

        \App\Models\AuditLog::log('update', 'assignment', "Memperbarui penempatan #{$assignment->id}", ['assignment_id' => $assignment->id, 'changes' => $assignment->getChanges()]);

        $worker = Worker::find($assignment->worker_id);

        if (!$isNowActive) {
            // Assignment has been terminated — preserve the NIK to assignment, then clear worker's NIK.
            if ($worker->nik_aru) {
                $assignment->update(['nik_aru' => $worker->nik_aru]);
            }
            $worker->update(['nik_aru' => null]);
        } elseif ($projectChanged) {
            // Worker moved to a different project — generate a new NIK.
            $project = Project::find($validated['project_id']);
            $newNik  = $this->generateNikForProject($project);
            $worker->update(['nik_aru' => $newNik]);
        }
        // Same project and still active: NIK is left unchanged.

        return redirect()->route('assignments.show', $assignment)
            ->with('message', 'Data penempatan berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Assignment $assignment): RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403);

        // PIC: route deletion through DataRequest for admin approval
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) abort(403);

            \App\Models\DataRequest::create([
                'worker_id' => $assignment->worker_id,
                'project_id' => $assignment->project_id,
                'request_type' => 'status_change',
                'requested_by' => $user->id,
                'requested_fields' => ['assignment_id'],
                'requested_data' => ['_action' => 'delete_assignment', 'assignment_id' => $assignment->id],
                'notes' => 'Penghapusan Penempatan oleh PIC',
                'status' => 'pending',
                'pic_status' => 'approved',
                'pic_reviewed_by' => $user->id,
                'pic_reviewed_at' => now(),
            ]);

            return redirect()->route('assignments.show', $assignment)
                ->with('message', 'Pengajuan penghapusan penempatan berhasil dikirim ke Admin untuk direview.');
        }

        $worker = Worker::find($assignment->worker_id); // Get worker before assignment is deleted
        \App\Models\AuditLog::log('delete', 'assignment', "Menghapus penempatan #{$assignment->id} untuk karyawan: {$worker->name}", ['assignment_id' => $assignment->id]);
        $assignment->delete();

        // After deletion, clear the worker's NIK — they have no active assignment.
        $worker->update(['nik_aru' => null]);

        return redirect()->route('workers.show', $worker)
            ->with('message', 'Penempatan berhasil dihapus.');
    }

    /**
     * Toggle the equipment returned status for an assignment.
     *
     * This is a direct action (no DataRequest flow) since it is purely
     * a PIC operational concern that Admin reads for visibility.
     *
     * @param Request $request
     * @param Assignment $assignment
     * @return RedirectResponse
     */
    public function toggleEquipmentReturned(Request $request, Assignment $assignment): RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403, 'Akses ditolak.');
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403, 'Akses ditolak.');

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Penempatan ini di luar wewenang project Anda.');
            }
        }

        $validated = $request->validate([
            'equipment_returned' => 'required|boolean',
        ]);

        $assignment->update(['equipment_returned' => $validated['equipment_returned']]);

        $worker = Worker::find($assignment->worker_id);
        \App\Models\AuditLog::log(
            'update',
            'assignment',
            "Mengubah status pengembalian perangkat kerja penempatan #{$assignment->id} untuk karyawan: {$worker->name} menjadi " . ($validated['equipment_returned'] ? 'Sudah' : 'Belum'),
            ['assignment_id' => $assignment->id, 'equipment_returned' => $validated['equipment_returned']]
        );

        return redirect()->back()->with('message', 'Status pengembalian perangkat kerja berhasil diperbarui.');
    }

    /**
     * Generate a new NIK ARU for a given project.
     *
     * Increments the project's running number and formats the NIK as:
     * {PREFIX}{PADDED_NUMBER} (e.g. "ARU001").
     *
     * @param  Project $project   The project to generate the NIK for.
     * @return string             The generated NIK ARU string.
     */
    public function generateNikForProject(Project $project): string
    {
        $prefix = (string) $project->prefix;

        // Get the highest number currently used by workers assigned to this project.
        // This ensures the number increments based on the project's own pool, regardless of the prefix.
        $maxWorkerNikNumber = \App\Models\Assignment::where('project_id', $project->id)
            ->join('workers', 'assignments.worker_id', '=', 'workers.id')
            ->whereNotNull('workers.nik_aru')
            ->pluck('workers.nik_aru')
            ->map(function ($nik) use ($prefix) {
                // If prefix is present, strip it. If not, just parse the numeric part.
                $numberPart = $prefix ? substr($nik, strlen($prefix)) : $nik;
                return is_numeric($numberPart) ? (int) $numberPart : 0;
            })
            ->max() ?? 0;

        // Determine the next number by comparing the project's recorded running number vs actual max from workers
        $currentMax = max((int) $project->id_running_number, $maxWorkerNikNumber);
        $nextNumber = $currentMax + 1;

        $project->update(['id_running_number' => $nextNumber]);

        $paddedNumber = str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        return "{$prefix}{$paddedNumber}";
    }
}