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
            'nik' => 'nullable|integer|digits:16',
            'bpjs_number' => 'nullable|integer|digits:13',
        ]);

        FamilyMember::create($validated);

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
            'nik' => 'nullable|integer|digits:16',
            'bpjs_number' => 'nullable|integer|digits:13',
        ]);

        $familyMember->update($validated);

        return redirect()->back()->with('success', 'Family member updated successfully.');
    }

    /**
     * Remove the specified family member from storage.
     *
     * @param \App\Models\FamilyMember $familyMember
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(FamilyMember $familyMember)
    {
        $familyMember->delete();

        return redirect()->back()->with('success', 'Family member removed successfully.');
    }
}