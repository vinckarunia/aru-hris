<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Worker;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

/**
 * Class ClientController
 *
 * Handles CRUD operations for the Client module.
 * Renders views using Inertia.js.
 */
class ClientController extends Controller
{
    /**
     * Display a listing of the clients.
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
                $query->with(['project:id,name', 'department:id,name']);
            }])
            ->get();

        return Inertia::render('Client/Index', [
            'clients' => $clients,
            'projects' => $projects,
            'workers' => $workers,
        ]);
    }

    /**
     * Display the specified client details including its departments, projects, and affiliated workers.
     *
     * Workers are resolved by traversing the chain:
     * Client → Projects → Assignments → Worker.
     *
     * @param Client $client
     * @return Response
     */
    public function show(Client $client): Response
    {
        // Eager load departments and projects (along with project's department relation)
        $client->load(['departments', 'projects.departments']);

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
                      ->with(['project:id,name', 'department:id,name']);
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