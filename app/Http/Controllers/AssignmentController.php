<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Worker;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

/**
 * Class AssignmentController
 *
 * Handles CRUD operations for worker assignments to projects/branches.
 */
class AssignmentController extends Controller
{
    /**
     * Show the form for creating a new assignment.
     * Requires a worker_id query parameter.
     */
    public function create(Request $request): Response
    {
        $request->validate(['worker_id' => 'required|exists:workers,id']);

        $worker = Worker::findOrFail($request->worker_id);
        // Eager load branches for the dependent dropdown
        $projects = Project::with('branches')->orderBy('name')->get();

        return Inertia::render('Assignment/Create', [
            'worker'   => $worker,
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created assignment and generate a fresh NIK ARU for the worker.
     *
     * A new NIK ARU is always generated based on the selected project's prefix,
     * reflecting the worker's active placement context.
     */
    public function store(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'worker_id'        => 'required|exists:workers,id',
            'project_id'       => 'required|exists:projects,id',
            'branch_id'        => 'required|exists:branches,id',
            'employee_id'      => [
                'nullable', 'string', 'max:255',
                Rule::unique('assignments')->where('project_id', $request->project_id),
            ],
            'position'         => 'nullable|string|max:255',
            'hire_date'        => 'required|date',
            'status'           => 'nullable|in:active,contract expired,resign,fired,other',
            'termination_date' => 'nullable|date|after_or_equal:hire_date',
        ], [
            'employee_id.unique' => 'ID Karyawan ini sudah digunakan di Project tersebut.',
        ]);

        $validator->after(function ($validator) use ($request) {
            if (is_null($request->termination_date)) {
                $hasActive = Assignment::where('worker_id', $request->worker_id)
                    ->whereNull('termination_date')
                    ->exists();

                if ($hasActive) {
                    $validator->errors()->add(
                        'termination_date',
                        'Karyawan ini masih memiliki penempatan aktif. Harap untuk mengakhiri penempatan sebelumnya terlebih dahulu.'
                    );
                }
            }
        });

        $validated = $validator->validate();

        $assignment = Assignment::create($validated);

        // Generate a fresh NIK ARU based on the assigned project.
        // NIK is always (re-)generated on a new active assignment.
        if (is_null($validated['termination_date'] ?? null)) {
            $worker  = Worker::find($validated['worker_id']);
            $project = Project::find($validated['project_id']);
            $newNik  = $this->generateNikForProject($project);
            $worker->update(['nik_aru' => $newNik]);
        }

        return redirect()->route('assignments.show', $assignment->id)
            ->with('message', 'Penempatan karyawan berhasil ditambahkan!');
    }

    /**
     * Display the specified assignment and its associated contracts.
     */
    public function show(Assignment $assignment): Response
    {
        $assignment->load(['worker', 'project', 'branch', 'contracts']);

        return Inertia::render('Assignment/Show', [
            'assignment' => $assignment,
        ]);
    }

    /**
     * Show the form for editing the specified assignment.
     */
    public function edit(Assignment $assignment): Response
    {
        $assignment->load('worker');
        $projects = Project::with('branches')->orderBy('name')->get();

        return Inertia::render('Assignment/Edit', [
            'assignment' => $assignment,
            'projects'   => $projects,
        ]);
    }

    /**
     * Update the specified assignment and sync worker's NIK ARU accordingly.
     *
     * Rules:
     * - Same project: NIK remains unchanged.
     * - Different project (still active): NIK is re-generated from the new project's prefix.
     * - Assignment terminated (termination_date set): NIK is cleared to null.
     */
    public function update(Request $request, Assignment $assignment): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'project_id'       => 'required|exists:projects,id',
            'branch_id'        => 'required|exists:branches,id',
            'employee_id'      => [
                'nullable', 'string', 'max:255',
                Rule::unique('assignments')->where('project_id', $request->project_id)->ignore($assignment->id),
            ],
            'position'         => 'nullable|string|max:255',
            'hire_date'        => 'required|date',
            'status'           => 'nullable|in:active,contract expired,resign,fired,other',
            'termination_date' => 'nullable|date|after_or_equal:hire_date',
        ]);

        $validator->after(function ($validator) use ($request, $assignment) {
            if (is_null($request->termination_date)) {
                $hasActive = Assignment::where('worker_id', $assignment->worker_id)
                    ->where('id', '!=', $assignment->id)
                    ->whereNull('termination_date')
                    ->exists();

                if ($hasActive) {
                    $validator->errors()->add(
                        'termination_date',
                        'Karyawan ini memiliki penempatan aktif lain. Harap untuk mengakhiri penempatan lainnya terlebih dahulu.'
                    );
                }
            }
        });

        $validated = $validator->validate();

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

        return redirect()->route('assignments.show', $assignment->id)
            ->with('message', 'Data penempatan berhasil diperbarui.');
    }

    /**
     * Remove the specified assignment.
     *
     * Clears the worker's NIK ARU since there is no longer an active placement.
     */
    public function destroy(Assignment $assignment): RedirectResponse
    {
        $worker = Worker::find($assignment->worker_id);
        $assignment->delete();

        // After deletion, clear the worker's NIK — they have no active assignment.
        $worker->update(['nik_aru' => null]);

        return redirect()->route('workers.show', $worker->id)
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
    private function generateNikForProject(Project $project): string
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