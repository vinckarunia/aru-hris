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
        $query = EditRequest::with(['worker:id,name', 'project:id,name', 'requester:id,name', 'reviewer:id,name'])->latest();

        if ($user->isWorker()) {
            $query->where('worker_id', $user->worker_id);
        } elseif ($user->isPic()) {
            // Dapatkan project_ids yang dihandle PIC ini
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $query->whereIn('project_id', $projectIds);
        }
        // Super/ARU bisa lihat semua

        return Inertia::render('EditRequest/Index', [
            'editRequests' => $query->get()
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (!$user->isWorker() || !$user->worker_id) {
            return back()->with('error', 'Hanya karyawan yang dapat mengajukan permintaan edit.');
        }

        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'requested_fields' => 'required|array',
            'notes' => 'nullable|string',
        ]);

        EditRequest::create([
            'worker_id' => $user->worker_id,
            'project_id' => $validated['project_id'],
            'requested_by' => $user->id,
            'requested_fields' => $validated['requested_fields'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        return redirect()->back()->with('message', 'Permintaan edit berhasil diajukan dan menunggu persetujuan PIC.');
    }

    public function review(Request $request, EditRequest $editRequest): RedirectResponse
    {
        $user = $request->user();

        // Validasi akses: PIC (hanya di projectnya), ADMIN_ARU, SUPER_ADMIN
        if ($user->isWorker()) {
            abort(403, 'Akses ditolak.');
        }

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($editRequest->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Anda bukan PIC untuk project ini.');
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

        // Note: Pengubahan data asli Worker belum diotomatiskan. 
        // PIC / Admin perlu mengubah manual melalui Edit Worker.
        
        return redirect()->back()->with('message', 'Status permintaan edit berhasil diperbarui.');
    }
}
