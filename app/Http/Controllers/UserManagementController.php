<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $role = $request->input('role', UserRole::SUPER_ADMIN->value);
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $users = User::where('role', $role)
            ->orderBy($sort, $direction)
            ->get();

        return Inertia::render('UserManagement/Index', [
            'users' => $users,
            'filters' => [
                'role' => $role,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', Rule::enum(UserRole::class)],
        ]);

        if ($validated['role'] === UserRole::SUPER_ADMIN->value && !auth()->user()->isSuperAdmin()) {
            return back()->withErrors(['role' => 'Hanya Super Admin yang dapat membuat Super Admin baru.']);
        }
        
        if ($validated['role'] === UserRole::SUPER_ADMIN->value && User::where('role', UserRole::SUPER_ADMIN)->exists()) {
            return back()->withErrors(['role' => 'Maksimal hanya 1 Super Admin di sistem.']);
        }

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return redirect()->back()->with('message', 'User berhasil ditambahkan.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            'role' => ['required', Rule::enum(UserRole::class)],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
        ]);
        
        if ($user->isSuperAdmin() && !auth()->user()->isSuperAdmin()) {
            return back()->withErrors(['role' => 'Hanya Super Admin yang dapat mengubah data Super Admin.']);
        }

        if ($user->isSuperAdmin() && $validated['role'] !== UserRole::SUPER_ADMIN->value) {
            return back()->withErrors(['role' => 'Tidak dapat mengubah role dari Super Admin.']);
        }

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        return redirect()->back()->with('message', 'User berhasil diperbarui.');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->isSuperAdmin()) {
            return back()->withErrors(['error' => 'Super Admin tidak dapat dihapus.']);
        }

        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'Anda tidak dapat menghapus akun Anda sendiri.']);
        }

        $user->delete();
        return redirect()->back()->with('message', 'User berhasil dihapus.');
    }
}
