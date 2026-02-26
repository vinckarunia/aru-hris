<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Class DepartmentController
 *
 * Handles CRUD operations for the Department module.
 * Renders views using Inertia.js.
 */
class DepartmentController extends Controller
{
    /**
     * Display a listing of the departments.
     *
     * @return Response
     */
    public function index(): Response
    {
        // Eager load the client relationship
        $departments = Department::with('client')->latest()->get();
        
        // Fetch clients for the dropdown menu
        $clients = Client::orderBy('full_name')->get(['id', 'full_name', 'short_name']);

        return Inertia::render('Department/Index', [
            'departments' => $departments,
            'clients' => $clients,
        ]);
    }

    /**
     * Store a newly created department in storage.
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
                // Department name must be unique within the same client
                Rule::unique('departments')->where('client_id', $request->client_id),
            ],
        ], [
            'name.unique' => 'Nama departemen ini sudah ada di Perusahaan Klien tersebut.',
        ]);

        Department::create($validated);

        return redirect()->back()->with('message', 'Departemen berhasil ditambahkan.');
    }

    /**
     * Update the specified department in storage.
     *
     * @param Request $request
     * @param Department $department
     * @return RedirectResponse
     */
    public function update(Request $request, Department $department): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'name' => [
                'required',
                'string',
                'max:255',
                // Department name must be unique within the same client, ignoring current ID
                Rule::unique('departments')->where('client_id', $request->client_id)->ignore($department->id),
            ],
        ], [
            'name.unique' => 'Nama departemen ini sudah ada di Perusahaan Klien tersebut.',
        ]);

        $department->update($validated);

        return redirect()->back()->with('message', 'Departemen berhasil diperbarui.');
    }

    /**
     * Remove the specified department from storage.
     *
     * @param Department $department
     * @return RedirectResponse
     */
    public function destroy(Department $department): RedirectResponse
    {
        $department->delete();

        return redirect()->back()->with('message', 'Departemen berhasil dihapus.');
    }
}