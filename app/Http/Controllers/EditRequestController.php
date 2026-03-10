<?php

namespace App\Http\Controllers;

use App\Models\EditRequest;
use App\Models\Project;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class EditRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');

        $query = EditRequest::with(['worker:id,nik_aru,name', 'project:id,name', 'requester:id,name', 'reviewer:id,name']);

        if ($user->isWorker()) {
            $query->where('worker_id', $user->worker_id);
        } elseif ($user->isPic()) {
            // Get project_ids handled by this PIC
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $query->whereIn('project_id', $projectIds);
        }
        // Super Admin and Admin ARU can view all records

        $status = $request->input('status');

        if ($sort === 'worker_name') {
            $query->join('workers', 'edit_requests.worker_id', '=', 'workers.id')
                  ->select('edit_requests.*')
                  ->orderBy('workers.name', $direction);
        } else {
            $query->orderBy('edit_requests.' . $sort, $direction);
        }

        if ($status) {
            $query->where('edit_requests.status', $status);
        }

        return Inertia::render('EditRequest/Index', [
            'editRequests' => $query->get(),
            'filters' => [
                'sort' => $sort,
                'direction' => $direction,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Show the form for creating a new edit request.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        if (!$user->isWorker() || !$user->worker_id) {
            abort(403, 'Only workers can access this page.');
        }

        $worker = $user->worker()->with(['assignments.project'])->firstOrFail();

        return Inertia::render('EditRequest/Create', [
            'worker' => $worker
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (!$user->isWorker() || !$user->worker_id) {
            return back()->with('error', 'Only workers can submit edit requests.');
        }

        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'requested_fields' => 'required|array',
            'requested_data' => 'required|array', // Actual form payload (e.g., [ 'name' => 'John', 'bank_name' => 'BCA' ])
            'notes' => 'nullable|string',
        ]);

        EditRequest::create([
            'worker_id' => $user->worker_id,
            'project_id' => $validated['project_id'],
            'requested_by' => $user->id,
            'requested_fields' => $validated['requested_fields'],
            'requested_data' => $validated['requested_data'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        return redirect()->route('edit-requests.index')->with('message', 'Edit Request successfully submitted and is waiting for PIC approval.');
    }

    public function review(Request $request, EditRequest $editRequest): RedirectResponse
    {
        $user = $request->user();

        // Access validation: PIC (only for their assigned projects), ADMIN_ARU, SUPER_ADMIN
        if ($user->isWorker()) {
            abort(403, 'Access denied.');
        }

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($editRequest->project_id, $projectIds)) {
                abort(403, 'Access denied. You are not a PIC for this project.');
            }
        }

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'review_notes' => 'nullable|string',
        ]);

        $editRequest->update([
            'status' => $validated['status'],
            'reviewed_by' => $user->id,
            'review_notes' => $validated['review_notes'],
            'reviewed_at' => now(),
        ]);

        // If Approved, automatically apply the requested changes payload to the actual Worker record
        if ($validated['status'] === 'approved' && is_array($editRequest->requested_data)) {
            $worker = $editRequest->worker;
            if ($worker) {
                $worker->update($editRequest->requested_data);
            }
        }

        return redirect()->back()->with('message', 'Edit Request status successfully updated.');
    }
}
