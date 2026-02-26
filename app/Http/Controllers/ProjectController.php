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
    public function index(): Response
    {
        // Eager load relationships
        $projects = Project::with(['client', 'department'])->latest()->get();
        
        // Fetch clients and departments for the dependent dropdowns
        $clients = Client::orderBy('full_name')->get(['id', 'full_name', 'short_name']);
        $departments = Department::orderBy('name')->get(['id', 'client_id', 'name']);

        return Inertia::render('Project/Index', [
            'projects' => $projects,
            'clients' => $clients,
            'departments' => $departments,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'department_id' => [
                'required',
                Rule::exists('departments', 'id')->where('client_id', $request->client_id)
            ],
            'name' => [
                'required', 'string', 'max:255',
                // Harus unik di dalam departemen dan klien yang sama
                Rule::unique('projects')
                    ->where('client_id', $request->client_id)
                    ->where('department_id', $request->department_id),
            ],
            'prefix' => 'required|string|max:50|unique:projects,prefix',
        ], [
            'name.unique' => 'Nama project ini sudah ada di departemen tersebut.',
            'prefix.unique' => 'Prefix ini sudah digunakan oleh project lain.',
            'department_id.exists' => 'Departemen tidak valid untuk klien yang dipilih.'
        ]);

        Project::create($validated);

        return redirect()->back()->with('message', 'Project berhasil ditambahkan.');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'department_id' => [
                'required',
                Rule::exists('departments', 'id')->where('client_id', $request->client_id)
            ],
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('projects')
                    ->where('client_id', $request->client_id)
                    ->where('department_id', $request->department_id)
                    ->ignore($project->id),
            ],
            'prefix' => 'required|string|max:50|unique:projects,prefix,' . $project->id,
        ], [
            'name.unique' => 'Nama project ini sudah ada di departemen tersebut.',
            'prefix.unique' => 'Prefix ini sudah digunakan oleh project lain.',
        ]);

        $project->update($validated);

        return redirect()->back()->with('message', 'Project berhasil diperbarui.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();
        return redirect()->back()->with('message', 'Project berhasil dihapus.');
    }
}