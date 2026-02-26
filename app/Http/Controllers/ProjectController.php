<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Class ProjectController
 *
 * Handles CRUD operations for the Project module.
 * Renders views using Inertia.js.
 */
class ProjectController extends Controller
{
    /**
     * Display a listing of the projects.
     *
     * @return Response
     */
    public function index(): Response
    {
        // Eager load the client relationship to avoid N+1 query problems
        $projects = Project::with('client')->latest()->get();
        
        // Fetch clients for the dropdown menu in the create/edit form
        $clients = Client::orderBy('full_name')->get(['id', 'full_name', 'short_name']);

        return Inertia::render('Project/Index', [
            'projects' => $projects,
            'clients' => $clients,
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
            'client_id' => 'required|exists:clients,id',
            'name' => [
                'required',
                'string',
                'max:255',
                // Project name must be unique within the same client
                Rule::unique('projects')->where('client_id', $request->client_id),
            ],
            'prefix' => 'required|string|max:50',
        ], [
            'name.unique' => 'Nama project ini sudah digunakan untuk Client tersebut.',
        ]);

        Project::create($validated);

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
            'client_id' => 'required|exists:clients,id',
            'name' => [
                'required',
                'string',
                'max:255',
                // Project name must be unique within the same client, ignoring the current project
                Rule::unique('projects')->where('client_id', $request->client_id)->ignore($project->id),
            ],
            'prefix' => 'required|string|max:50',
        ], [
            'name.unique' => 'Nama project ini sudah digunakan untuk Client tersebut.',
        ]);

        $project->update($validated);

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