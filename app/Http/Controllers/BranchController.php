<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Client;
use App\Models\Project;
use App\Models\Assignment;
use App\Models\Worker;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Class BranchController
 *
 * Handles CRUD operations for the Branch (cabang) module.
 * Renders views using Inertia.js.
 */
class BranchController extends Controller
{
    /**
     * Display a listing of the branches.
     *
     * @return Response
     */
    public function index(): Response
    {
        // Eager load the client relationship
        $branches = Branch::with('client')->latest()->get();

        // Fetch clients for the dropdown menu
        $clients = Client::orderBy('full_name')->get(['id', 'full_name', 'short_name']);

        return Inertia::render('Branch/Index', [
            'branches' => $branches,
            'clients'  => $clients,
        ]);
    }

    /**
     * Display the specified branch with its active projects and active workers.
     *
     * @param Branch $branch
     * @return Response
     */
    public function show(Branch $branch): Response
    {
        // Eager-load the parent client
        $branch->load('client');

        // Active projects linked to this branch via the branch_project pivot
        $projects = $branch->projects()->get(['projects.id', 'projects.name', 'projects.prefix']);

        // Workers with at least one active assignment in this branch
        $projectIds = $projects->pluck('id');
        $workers = Worker::whereHas('assignments', function ($query) use ($branch) {
                $query->where('branch_id', $branch->id)
                      ->where('status', 'active');
            })
            ->with(['assignments' => function ($query) use ($branch) {
                $query->where('branch_id', $branch->id)
                      ->where('status', 'active')
                      ->with(['project:id,name']);
            }])
            ->get(['id', 'nik_aru', 'name']);

        return Inertia::render('Branch/Show', [
            'branch'   => $branch,
            'projects' => $projects,
            'workers'  => $workers,
        ]);
    }

    /**
     * Store a newly created branch in storage.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'name'      => [
                'required',
                'string',
                'max:255',
                // Branch name must be unique within the same client
                Rule::unique('branches')->where('client_id', $request->client_id),
            ],
        ], [
            'name.unique' => 'Nama cabang ini sudah ada di Perusahaan Client tersebut.',
        ]);

        Branch::create($validated);

        return redirect()->back()->with('message', 'Cabang berhasil ditambahkan.');
    }

    /**
     * Update the specified branch in storage.
     *
     * @param Request $request
     * @param Branch $branch
     * @return RedirectResponse
     */
    public function update(Request $request, Branch $branch): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'name'      => [
                'required',
                'string',
                'max:255',
                // Branch name must be unique within the same client, ignoring current ID
                Rule::unique('branches')->where('client_id', $request->client_id)->ignore($branch->id),
            ],
        ], [
            'name.unique' => 'Nama cabang ini sudah ada di Perusahaan Client tersebut.',
        ]);

        $branch->update($validated);

        return redirect()->back()->with('message', 'Cabang berhasil diperbarui.');
    }

    /**
     * Remove the specified branch from storage.
     *
     * @param Branch $branch
     * @return RedirectResponse
     */
    public function destroy(Branch $branch): RedirectResponse
    {
        $branch->delete();

        return redirect()->back()->with('message', 'Cabang berhasil dihapus.');
    }
}