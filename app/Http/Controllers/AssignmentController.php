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
 * Handles CRUD operations for worker assignments to projects/departments.
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
        // Eager load departments for the dependent dropdown
        $projects = Project::with('departments')->orderBy('name')->get();

        return Inertia::render('Assignment/Create', [
            'worker' => $worker,
            'projects' => $projects,
        ]);
    }

    /**
     * Store a newly created assignment and generate NIK ARU if needed.
     */
    public function store(Request $request): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'worker_id' => 'required|exists:workers,id',
            'project_id' => 'required|exists:projects,id',
            'department_id' => 'required|exists:departments,id',
            'employee_id' => [
                'nullable', 'string', 'max:255',
                Rule::unique('assignments')->where('project_id', $request->project_id)
            ],
            'position' => 'nullable|string|max:255',
            'hire_date' => 'required|date',
            'status' => 'nullable|in:active,contract expired,resign,fired,other',
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
                        'Pekerja ini masih memiliki penempatan aktif. Harap untuk menutup penempatan sebelumnya terlebih dahulu.'
                    );
                }
            }
        });

        $validated = $validator->validate();

        $assignment = Assignment::create($validated);

        // --- NIK ARU AUTO-GENERATION LOGIC ---
        $worker = Worker::find($validated['worker_id']);
        if (empty($worker->nik_aru)) {
            $project = Project::find($validated['project_id']);
            
            $nextNumber = $project->id_running_number + 1;
            $project->update(['id_running_number' => $nextNumber]);

            // Format: PREFIX-YEAR-001
            $paddedNumber = str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
            $year = date('Y', strtotime($validated['hire_date']));
            $newNik = "{$project->prefix}-{$year}-{$paddedNumber}";
            
            $worker->update(['nik_aru' => $newNik]);
        }

        return redirect()->route('assignments.show', $assignment->id)->with('message', 'Penempatan pekerja berhasil ditambahkan!');
    }

    /**
     * Display the specified assignment and its associated contracts.
     */
    public function show(Assignment $assignment): Response
    {
        // Load relationships including contracts when we build them in Step 2
        $assignment->load(['worker', 'project', 'department']);

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
        $projects = Project::with('departments')->orderBy('name')->get();

        return Inertia::render('Assignment/Edit', [
            'assignment' => $assignment,
            'projects' => $projects,
        ]);
    }

    /**
     * Update the specified assignment.
     */
    public function update(Request $request, Assignment $assignment): RedirectResponse
    {
        $validator = Validator::make($request->all(), [
            'project_id' => 'required|exists:projects,id',
            'department_id' => 'required|exists:departments,id',
            'employee_id' => [
                'nullable', 'string', 'max:255',
                Rule::unique('assignments')->where('project_id', $request->project_id)->ignore($assignment->id)
            ],
            'position' => 'nullable|string|max:255',
            'hire_date' => 'required|date',
            'status' => 'nullable|in:active,contract expired,resign,fired,other',
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
                        'Pekerja ini memiliki penempatan aktif lain. Harap untuk menutup penempatan lainnya terlebih dahulu.'
                    );
                }
            }
        });

        $validated = $validator->validate();

        $assignment->update($validated);

        return redirect()->route('assignments.show', $assignment->id)->with('message', 'Data penempatan berhasil diperbarui.');
    }

    /**
     * Remove the specified assignment.
     */
    public function destroy(Assignment $assignment): RedirectResponse
    {
        $workerId = $assignment->worker_id;
        $assignment->delete();

        return redirect()->route('workers.show', $workerId)->with('message', 'Penempatan berhasil dihapus.');
    }
}