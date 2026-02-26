<?php

namespace App\Http\Controllers;

use App\Models\Client;
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

        return Inertia::render('Client/Index', [
            'clients' => $clients,
        ]);
    }

    /**
     * Display the specified client details including its departments and projects.
     *
     * @param Client $client
     * @return Response
     */
    public function show(Client $client): Response
    {
        // Eager load departments and projects (along with project's department relation)
        $client->load(['departments', 'projects.departments']);

        return Inertia::render('Client/Show', [
            'client' => $client,
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