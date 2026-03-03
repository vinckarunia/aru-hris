<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Client;
use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Class ProjectController
 *
 * Handles CRUD operations for the Project module.
 */
class ProjectController extends Controller
{
    /**
     * Display a listing of all projects.
     *
     * @return Response
     */
    public function index(): Response
    {
        // Eager load relationships
        $projects = Project::with(['client', 'departments'])->latest()->get();
        
        // Fetch clients and departments for the dependent dropdowns
        $clients = Client::orderBy('full_name')->get(['id', 'full_name', 'short_name']);
        $departments = Department::orderBy('name')->get(['id', 'client_id', 'name']);

        return Inertia::render('Project/Index', [
            'projects'    => $projects,
            'clients'     => $clients,
            'departments' => $departments,
        ]);
    }

    /**
     * Display the specified project's detail page, including affiliated workers.
     *
     * Workers are resolved through the project's assignments, each carrying
     * the worker and department data for display.
     *
     * @param Project $project
     * @return Response
     */
    public function show(Project $project): Response
    {
        $project->load([
            'client:id,full_name,short_name',
            'departments:id,name',
            'assignments' => function ($query) {
                $query->with([
                    'worker:id,nik_aru,name',
                    'department:id,name',
                    'contracts' => fn ($q) => $q->orderBy('start_date', 'desc'),
                ]);
            },
        ]);

        return Inertia::render('Project/Show', [
            'project' => $project,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'department_ids' => 'required|array|min:1',
            'department_ids.*' => [
                'required',
                Rule::exists('departments', 'id')->where('client_id', $request->client_id)
            ],
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('projects')->where('client_id', $request->client_id)
            ],
            'prefix' => 'required|string|max:5|unique:projects,prefix',
        ], [
            'name.unique' => 'Nama project ini sudah ada di departemen tersebut.',
            'prefix.unique' => 'Prefix ini sudah digunakan oleh project lain.',
            'department_ids.required' => 'Pilih minimal satu departemen.',
        ]);

        $project = Project::create([
            'client_id' => $validated['client_id'],
            'name' => $validated['name'],
            'prefix' => $validated['prefix'],
        ]);

        $project->departments()->attach($validated['department_ids']);

        return redirect()->back()->with('message', 'Project berhasil ditambahkan.');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'department_ids' => 'required|array|min:1',
            'department_ids.*' => [
                'required',
                Rule::exists('departments', 'id')->where('client_id', $request->client_id)
            ],
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('projects')->where('client_id', $request->client_id)->ignore($project->id)
            ],
            'prefix' => 'required|string|max:5|unique:projects,prefix,' . $project->id,
        ], [
            'name.unique' => 'Nama project ini sudah ada di departemen tersebut.',
            'prefix.unique' => 'Prefix ini sudah digunakan oleh project lain.',
            'department_ids.required' => 'Pilih minimal satu departemen.',
        ]);

        $project->update([
            'client_id' => $validated['client_id'],
            'name' => $validated['name'],
            'prefix' => $validated['prefix'],
        ]);

        $project->departments()->sync($validated['department_ids']);

        return redirect()->back()->with('message', 'Project berhasil diperbarui.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();
        return redirect()->back()->with('message', 'Project berhasil dihapus.');
    }
}