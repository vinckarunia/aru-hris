<?php

namespace App\Http\Controllers;

use App\Models\FamilyMember;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Class FamilyMemberController
 *
 * Handles CRUD operations for the Family Member module.
 *
 * @package App\Http\Controllers
 */
class FamilyMemberController extends Controller
{
    /**
     * Store a newly created family member in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'worker_id' => 'required|exists:workers,id',
            'relationship_type' => 'required|in:spouse,child,parent,other relatives',
            'name' => 'required|string|max:255',
            'birth_place' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date',
            'nik' => 'nullable|numeric|digits:16',
            'bpjs_number' => 'nullable|numeric|digits:13',
        ]);

        if (!$request->user()->isAdminOrAbove()) {
            $worker = \App\Models\Worker::find($validated['worker_id']);
            $activeAssignment = $worker ? $worker->assignments()->whereIn('status', ['active', 'probation', 'extended'])->first() : null;

            \App\Models\DataRequest::create([
                'worker_id' => $validated['worker_id'],
                'project_id' => $activeAssignment ? $activeAssignment->project_id : null,
                'requested_by' => $request->user()->id,
                'request_type' => 'data_change',
                'requested_fields' => [],
                'status' => 'pending',
                'requested_data' => array_merge($validated, ['_action' => 'add_family']),
            ]);
            return redirect()->back()->with('success', 'Pengajuan tambah keluarga sukses direkam dan menunggu persetujuan Admin.');
        }

        $familyMember = FamilyMember::create($validated);

        \App\Models\AuditLog::log('create', 'family_member', "Menambahkan data keluarga: {$familyMember->name}", ['family_member_id' => $familyMember->id, 'worker_id' => $familyMember->worker_id]);

        return redirect()->back()->with('success', 'Family member added successfully.');
    }

    /**
     * Update the specified family member in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\FamilyMember $familyMember
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, FamilyMember $familyMember)
    {
        $validated = $request->validate([
            'relationship_type' => 'required|in:spouse,child,parent,other relatives',
            'name' => 'required|string|max:255',
            'birth_place' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date',
            'nik' => 'nullable|numeric|digits:16',
            'bpjs_number' => 'nullable|numeric|digits:13',
        ]);

        if (!$request->user()->isAdminOrAbove()) {
            $worker = \App\Models\Worker::find($familyMember->worker_id);
            $activeAssignment = $worker ? $worker->assignments()->whereIn('status', ['active', 'probation', 'extended'])->first() : null;

            \App\Models\DataRequest::create([
                'worker_id' => $familyMember->worker_id,
                'project_id' => $activeAssignment ? $activeAssignment->project_id : null,
                'requested_by' => $request->user()->id,
                'request_type' => 'data_change',
                'requested_fields' => [],
                'status' => 'pending',
                'requested_data' => array_merge($validated, ['_action' => 'update_family', 'family_id' => $familyMember->id]),
            ]);
            return redirect()->back()->with('success', 'Pengajuan ubah data keluarga sukses direkam dan menunggu persetujuan Admin.');
        }

        $familyMember->update($validated);

        \App\Models\AuditLog::log('update', 'family_member', "Memperbarui data keluarga: {$familyMember->name}", ['family_member_id' => $familyMember->id, 'worker_id' => $familyMember->worker_id, 'changes' => $familyMember->getChanges()]);

        return redirect()->back()->with('success', 'Family member updated successfully.');
    }

    /**
     * Remove the specified family member from storage.
     *
     * @param \App\Models\FamilyMember $familyMember
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Request $request, FamilyMember $familyMember)
    {
        if (!$request->user()->isAdminOrAbove()) {
            $worker = \App\Models\Worker::find($familyMember->worker_id);
            $activeAssignment = $worker ? $worker->assignments()->whereIn('status', ['active', 'probation', 'extended'])->first() : null;

            \App\Models\DataRequest::create([
                'worker_id' => $familyMember->worker_id,
                'project_id' => $activeAssignment ? $activeAssignment->project_id : null,
                'requested_by' => $request->user()->id,
                'request_type' => 'data_change',
                'requested_fields' => [],
                'status' => 'pending',
                'requested_data' => ['_action' => 'delete_family', 'family_id' => $familyMember->id, 'name' => $familyMember->name],
            ]);
            return redirect()->back()->with('success', 'Pengajuan hapus data keluarga sukses direkam dan menunggu persetujuan Admin.');
        }

        \App\Models\AuditLog::log('delete', 'family_member', "Menghapus data keluarga: {$familyMember->name}", ['family_member_id' => $familyMember->id, 'worker_id' => $familyMember->worker_id]);
        $familyMember->delete();

        return redirect()->back()->with('success', 'Family member removed successfully.');
    }
}