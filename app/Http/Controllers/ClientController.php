<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Worker;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Class ClientController
 *
 * Handles CRUD operations for the Client module.
 * Renders views using Inertia.js.
 */
class ClientController extends Controller implements HasMiddleware
{
    /**
     * Get the middleware that should be assigned to the controller.
     */
    public static function middleware(): array
    {
        return [
            new Middleware('role:SUPER_ADMIN,ADMIN_ARU'),
        ];
    }

    /**
     * Display a listing of the resource.
     *
     * @return Response
     */
    public function index(): Response
    {
        // Fetch clients ordered by the latest created
        $clients = Client::latest()->get();
        $projects = Project::whereHas('client')->get();
        $workers = Worker::whereHas('assignments')
            ->with(['assignments' => function ($query) {
                $query->with(['project:id,name', 'branch:id,name']);
            }])
            ->get();

        return Inertia::render('Client/Index', [
            'clients' => $clients,
            'projects' => $projects,
            'workers' => $workers,
        ]);
    }

    /**
     * Display the specified client details including its branches, projects, and affiliated workers.
     *
     * Workers are resolved by traversing the chain:
     * Client → Projects → Assignments → Worker.
     *
     * @param Client $client
     * @return Response
     */
    public function show(Client $client): Response
    {
        // Eager load branches (with project count) and projects (with their branches)
        $client->load(['branches.projects', 'projects.branches']);

        // Attach derived counts to each branch for the frontend table
        $client->branches->each(function ($branch) {
            $branch->projects_count = $branch->projects->count();

            // Count workers with at least one active assignment in this branch
            $branch->active_workers_count = \App\Models\Worker::whereHas(
                'assignments',
                fn($q) => $q->where('branch_id', $branch->id)->where('status', 'active')
            )->count();
        });

        // Collect all project IDs belonging to this client
        $projectIds = $client->projects->pluck('id');

        // Fetch workers who have at least one ACTIVE assignment within this client's projects.
        // Only the active assignments are eager-loaded for display.
        $workers = Worker::whereHas('assignments', function ($query) use ($projectIds) {
                $query->whereIn('project_id', $projectIds)
                      ->where('status', 'active');
            })
            ->with(['assignments' => function ($query) use ($projectIds) {
                $query->whereIn('project_id', $projectIds)
                      ->where('status', 'active')
                      ->with(['project:id,name', 'branch:id,name']);
            }])
            ->get(['id', 'nik_aru', 'name']);

        return Inertia::render('Client/Show', [
            'client'  => $client,
            'workers' => $workers,
        ]);
    }


    /**
     * Store a newly created client in storage.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255|unique:clients,full_name',
            'short_name' => 'required|string|max:50|unique:clients,short_name',
            'mou_start_date' => 'nullable|date',
            'mou_end_date' => 'nullable|date|after_or_equal:mou_start_date',
        ]);

        Client::create($validated);

        return redirect()->back()->with('message', 'Client berhasil ditambahkan.');
    }

    /**
     * Update the specified client in storage.
     *
     * @param Request $request
     * @param Client $client
     * @return RedirectResponse
     */
    public function update(Request $request, Client $client): RedirectResponse
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255|unique:clients,full_name,' . $client->id,
            'short_name' => 'required|string|max:50|unique:clients,short_name,' . $client->id,
            'mou_start_date' => 'nullable|date',
            'mou_end_date' => 'nullable|date|after_or_equal:mou_start_date',
        ]);

        $client->update($validated);

        return redirect()->back()->with('message', 'Client berhasil diperbarui.');
    }

    /**
     * Remove the specified client from storage.
     *
     * @param Client $client
     * @return RedirectResponse
     */
    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();

        return redirect()->back()->with('message', 'Client berhasil dihapus.');
    }
}