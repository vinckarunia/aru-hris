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
use App\Enums\UserRole;
use App\Models\Pic;

/**
 * Class ProjectController
 *
 * Handles CRUD operations for the Project module.
 */
class ProjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        if ($user->isWorker()) {
            abort(403, 'Akses ditolak.');
        }

        $query = Project::with(['client', 'branches', 'pics:id,name']);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $query->whereIn('id', $projectIds);
        }

        $projects = $query->latest()->get();

        // Get distinct active statuses from clients for the filter
        $clients  = Client::orderBy('full_name')->get(['id', 'full_name', 'short_name']);
        $branches = Branch::orderBy('name')->get(['id', 'client_id', 'name']);
        
        // Pass PIC details for assignment in Create/Edit Modal Form
        $pics = Pic::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Project/Index', [
            'projects' => $projects,
            'clients'  => $clients,
            'branches' => $branches,
            'pics'     => $pics,
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Project $project): Response
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($project->id, $projectIds)) {
                abort(403, 'Akses ditolak. Project ini tidak dikelola oleh Anda.');
            }
        }

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
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        if (!$request->user()->isAdminOrAbove()) abort(403);
        $validated = $request->validate([
            'client_id'  => 'required|exists:clients,id',
            'branch_ids' => 'required|array|min:1',
            'branch_ids.*' => [
                'required',
                Rule::exists('branches', 'id')->where('client_id', $request->client_id)
            ],
            'pic_ids' => 'nullable|array',
            'pic_ids.*' => 'exists:pics,id',
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
        
        if (isset($validated['pic_ids']) && is_array($validated['pic_ids'])) {
            $project->pics()->attach($validated['pic_ids']);
        }

        return redirect()->back()->with('message', 'Project berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        if (!$request->user()->isAdminOrAbove()) abort(403);
        $validated = $request->validate([
            'client_id'  => 'required|exists:clients,id',
            'branch_ids' => 'required|array|min:1',
            'branch_ids.*' => [
                'required',
                Rule::exists('branches', 'id')->where('client_id', $request->client_id)
            ],
            'pic_ids' => 'nullable|array',
            'pic_ids.*' => 'exists:pics,id',
            'name'   => [
                'required', 'string', 'max:255',
                Rule::unique('projects')->where('client_id', $request->client_id)->ignore($project->id)
            ],
            'prefix' => 'required|string|max:5',
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
        
        if ($request->has('pic_ids')) {
            $project->pics()->sync($validated['pic_ids'] ?? []);
        }

        return redirect()->back()->with('message', 'Project berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        if (!$request->user()->isAdminOrAbove()) abort(403);
        $project->delete();
        return redirect()->back()->with('message', 'Project berhasil dihapus.');
    }
}