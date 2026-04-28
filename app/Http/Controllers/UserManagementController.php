<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\InternalEmployee;
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
            'internalEmployees' => InternalEmployee::select('id', 'name')
                ->whereDoesntHave('user')
                ->orderBy('name')
                ->get(),
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
            'internal_employee_id' => 'nullable|exists:internal_employees,id',
        ]);

        if ($validated['role'] === UserRole::SUPER_ADMIN->value && !auth()->user()->isSuperAdmin()) {
            return back()->withErrors(['role' => 'Hanya Super Admin yang dapat membuat Super Admin baru.']);
        }
        
        if ($validated['role'] === UserRole::SUPER_ADMIN->value && User::where('role', UserRole::SUPER_ADMIN)->exists()) {
            return back()->withErrors(['role' => 'Maksimal hanya 1 Super Admin di sistem.']);
        }

        if ($validated['role'] === UserRole::ADMIN_ARU->value && empty($validated['internal_employee_id'])) {
            return back()->withErrors(['internal_employee_id' => 'User dengan role ARU harus dihubungkan dengan data karyawan internal.']);
        }

        $newUser = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'internal_employee_id' => $validated['role'] === UserRole::ADMIN_ARU->value ? ($validated['internal_employee_id'] ?? null) : null,
        ]);

        \App\Models\AuditLog::log('create', 'user', "Membuat user: {$newUser->name} ({$newUser->role})", ['target_user_id' => $newUser->id]);

        return redirect()->back()->with('message', 'User berhasil ditambahkan.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            'role' => ['required', Rule::enum(UserRole::class)],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'internal_employee_id' => 'nullable|exists:internal_employees,id',
        ]);
        
        if ($user->isSuperAdmin() && !auth()->user()->isSuperAdmin()) {
            return back()->withErrors(['role' => 'Hanya Super Admin yang dapat mengubah data Super Admin.']);
        }

        if ($user->isSuperAdmin() && $validated['role'] !== UserRole::SUPER_ADMIN->value) {
            return back()->withErrors(['role' => 'Tidak dapat mengubah role dari Super Admin.']);
        }

        if ($validated['role'] === UserRole::ADMIN_ARU->value && empty($validated['internal_employee_id'])) {
            return back()->withErrors(['internal_employee_id' => 'User dengan role ARU harus dihubungkan dengan data karyawan internal.']);
        }

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'internal_employee_id' => $validated['role'] === UserRole::ADMIN_ARU->value ? ($validated['internal_employee_id'] ?? null) : null,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        \App\Models\AuditLog::log('update', 'user', "Memperbarui user: {$user->name}", ['target_user_id' => $user->id, 'changes' => $user->getChanges()]);

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

        \App\Models\AuditLog::log('delete', 'user', "Menghapus user: {$user->name}", ['target_user_id' => $user->id]);
        $user->delete();
        return redirect()->back()->with('message', 'User berhasil dihapus.');
    }
}
