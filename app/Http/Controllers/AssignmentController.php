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
        if (!$user->isAdminOrAbove()) abort(403, 'Akses ditolak. Wewenang untuk manajemen teknis penempatan secara langsung hanya ada pada Admin.');

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
        if (!$user->isAdminOrAbove()) abort(403, 'Akses ditolak. Wewenang untuk manajemen teknis penempatan secara langsung hanya ada pada Admin.');

        try {
            $validated = $request->validate([
                'worker_id'        => 'required|exists:workers,id',
                'project_id'       => 'required|exists:projects,id',
                'branch_id'        => 'required|exists:branches,id',
                'employee_id'      => [
                    'nullable', 'string', 'max:255',
                    Rule::unique('assignments')->where('project_id', $request->project_id),
                ],
                'position'         => 'nullable|string|max:255',
                'hire_date'        => 'required|date',
                'status'           => 'nullable|in:active,contract expired,resign,fired,project closed,other',
                'termination_date' => 'nullable|date|after_or_equal:hire_date',
            ], [
                'employee_id.unique' => 'ID Karyawan ini sudah digunakan di Project tersebut.',
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

        $assignment = Assignment::create($validated);

        // Generate a fresh NIK ARU based on the assigned project.
        // NIK is always (re-)generated on a new active assignment.
        if (is_null($validated['termination_date'] ?? null)) {
            $worker  = Worker::find($validated['worker_id']);
            $project = Project::find($validated['project_id']);
            $newNik  = $this->generateNikForProject($project);
            $worker->update(['nik_aru' => $newNik]);
        }

        return redirect()->route('assignments.show', $assignment)
            ->with('message', 'Penempatan karyawan berhasil ditambahkan!');
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

        $assignment->load(['worker', 'project', 'branch', 'contracts']);

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

        $assignment->load('worker');

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
                'branch_id'        => 'required|exists:branches,id',
                'employee_id'      => [
                    'nullable', 'string', 'max:255',
                    Rule::unique('assignments')->where('project_id', $request->project_id)->ignore($assignment->id),
                ],
                'position'         => 'nullable|string|max:255',
                'hire_date'        => 'required|date',
                'status'           => 'nullable|in:active,contract expired,resign,fired,project closed,other',
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

        $assignment->update($validated);

        $worker = Worker::find($assignment->worker_id);

        if (!$isNowActive) {
            // Assignment has been terminated — clear the worker's NIK.
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
        if (!$request->user()->isAdminOrAbove()) abort(403);
        $worker = Worker::find($assignment->worker_id); // Get worker before assignment is deleted
        $assignment->delete();

        // After deletion, clear the worker's NIK — they have no active assignment.
        $worker->update(['nik_aru' => null]);

        return redirect()->route('workers.show', $worker)
            ->with('message', 'Penempatan berhasil dihapus.');
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

        // Get the highest number currently used by workers for this prefix.
        // This handles cases where NIKs were imported and are higher than the current id_running_number.
        $maxWorkerNikNumber = \App\Models\Worker::whereNotNull('nik_aru')
            ->where('nik_aru', 'like', $prefix . '%')
            ->pluck('nik_aru')
            ->map(function ($nik) use ($prefix) {
                // Extract only the numeric part after the prefix
                $numberPart = substr($nik, strlen($prefix));
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