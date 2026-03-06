<?php

namespace App\Http\Controllers;

use App\Models\Pic;
use App\Models\User;
use App\Models\Project;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

class PicController extends Controller
{
    public function index(): Response
    {
        $pics = Pic::with(['user', 'projects:id,name'])->latest()->get();
        // Users dengan role PIC yang belum punya profile PIC
        $availableUsers = User::where('role', UserRole::PIC)->doesntHave('pic')->get(['id', 'name']);
        $projects = Project::get(['id', 'name']);

        return Inertia::render('Pic/Index', [
            'pics' => $pics,
            'availableUsers' => $availableUsers,
            'projects' => $projects,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id|unique:pics,user_id',
            'phone' => 'nullable|string|max:30',
            'project_ids' => 'nullable|array',
            'project_ids.*' => 'exists:projects,id',
        ]);

        $user = User::findOrFail($validated['user_id']);

        $pic = Pic::create([
            'user_id' => $validated['user_id'],
            'name' => $user->name,
            'phone' => $validated['phone'],
        ]);

        if (!empty($validated['project_ids'])) {
            $pic->projects()->attach($validated['project_ids']);
        }

        return redirect()->back()->with('message', 'Profil PIC berhasil dibuat.');
    }

    public function update(Request $request, Pic $pic): RedirectResponse
    {
        $validated = $request->validate([
            'phone' => 'nullable|string|max:30',
            'project_ids' => 'nullable|array',
            'project_ids.*' => 'exists:projects,id',
        ]);

        $pic->update([
            'name' => $pic->user->name,
            'phone' => $validated['phone'],
        ]);

        if (isset($validated['project_ids'])) {
            $pic->projects()->sync($validated['project_ids']);
        } else {
            $pic->projects()->detach();
        }

        return redirect()->back()->with('message', 'Profil PIC berhasil diperbarui.');
    }

    public function destroy(Pic $pic): RedirectResponse
    {
        $pic->delete();
        return redirect()->back()->with('message', 'Profil PIC berhasil dihapus.');
    }
}
