<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Client;
use App\Models\Branch;
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
        $projects = Project::with(['client', 'branches'])->latest()->get();

        // Fetch clients and branches for the dependent dropdowns
        $clients  = Client::orderBy('full_name')->get(['id', 'full_name', 'short_name']);
        $branches = Branch::orderBy('name')->get(['id', 'client_id', 'name']);

        return Inertia::render('Project/Index', [
            'projects' => $projects,
            'clients'  => $clients,
            'branches' => $branches,
        ]);
    }

    /**
     * Display the specified project's detail page, including affiliated workers.
     *
     * Workers are resolved through the project's assignments, each carrying
     * the worker and branch data for display.
     *
     * @param Project $project
     * @return Response
     */
    public function show(Project $project): Response
    {
        $project->load([
            'client:id,full_name,short_name',
            'branches:id,name',
            'assignments' => function ($query) {
                $query->with([
                    'worker:id,nik_aru,name',
                    'branch:id,name',
                    'contracts' => fn ($q) => $q->orderBy('start_date', 'desc'),
                ]);
            },
        ]);

        return Inertia::render('Project/Show', [
            'project' => $project,
        ]);
    }

    /**
     * Store a newly created project in storage.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id'  => 'required|exists:clients,id',
            'branch_ids' => 'required|array|min:1',
            'branch_ids.*' => [
                'required',
                Rule::exists('branches', 'id')->where('client_id', $request->client_id)
            ],
            'name'   => [
                'required', 'string', 'max:255',
                Rule::unique('projects')->where('client_id', $request->client_id)
            ],
            'prefix' => 'required|string|max:5',
        ], [
            'name.unique'        => 'Nama project ini sudah ada di cabang tersebut.',
            'prefix.unique'      => 'Prefix ini sudah digunakan oleh project lain.',
            'branch_ids.required' => 'Pilih minimal satu cabang.',
        ]);

        $project = Project::create([
            'client_id' => $validated['client_id'],
            'name'      => $validated['name'],
            'prefix'    => $validated['prefix'],
        ]);

        $project->branches()->attach($validated['branch_ids']);

        return redirect()->back()->with('message', 'Project berhasil ditambahkan.');
    }

    /**
     * Update the specified project in storage.
     *
     * @param Request $request
     * @param Project $project
     * @return RedirectResponse
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'client_id'  => 'required|exists:clients,id',
            'branch_ids' => 'required|array|min:1',
            'branch_ids.*' => [
                'required',
                Rule::exists('branches', 'id')->where('client_id', $request->client_id)
            ],
            'name'   => [
                'required', 'string', 'max:255',
                Rule::unique('projects')->where('client_id', $request->client_id)->ignore($project->id)
            ],
            'prefix' => 'required|string|max:5' . $project->id,
        ], [
            'name.unique'        => 'Nama project ini sudah ada di cabang tersebut.',
            'prefix.unique'      => 'Prefix ini sudah digunakan oleh project lain.',
            'branch_ids.required' => 'Pilih minimal satu cabang.',
        ]);

        $project->update([
            'client_id' => $validated['client_id'],
            'name'      => $validated['name'],
            'prefix'    => $validated['prefix'],
        ]);

        $project->branches()->sync($validated['branch_ids']);

        return redirect()->back()->with('message', 'Project berhasil diperbarui.');
    }

    /**
     * Remove the specified project from storage.
     *
     * @param Project $project
     * @return RedirectResponse
     */
    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();
        return redirect()->back()->with('message', 'Project berhasil dihapus.');
    }
}