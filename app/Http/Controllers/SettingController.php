<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class SettingController extends Controller
{
    /**
     * Display a listing of the system settings.
     */
    public function index()
    {
        $settings = Setting::all()->keyBy('key')->map->value;
        
        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update the system settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key, 'role_specifier' => null],
                ['value' => $value, 'group' => 'general']
            );
        }

        return Redirect::route('settings.index')->with('success', 'Pengaturan sistem berhasil diperbarui.');
    }
    public function resetData(Request $request)
    {
        if ($request->user()->role !== \App\Enums\UserRole::SUPER_ADMIN) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'password' => 'required|current_password',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () {
            \Illuminate\Support\Facades\DB::statement('SET CONSTRAINTS ALL DEFERRED');
            
            // Clear operational data using delete() instead of truncate() 
            // because postgres truncate() cascades to users table due to foreign keys.
            \App\Models\ContractCompensation::query()->delete();
            \App\Models\Contract::query()->delete();
            \App\Models\Assignment::query()->delete();
            \App\Models\Worker::query()->delete();
            \App\Models\Pic::query()->delete();
            \App\Models\Project::query()->delete();
            \App\Models\Branch::query()->delete();
            \App\Models\Client::query()->delete();
            \App\Models\FamilyMember::query()->delete();
            \App\Models\EditRequest::query()->delete();
            \App\Models\Document::query()->delete();
            \App\Models\Reminder::query()->delete();
            
            \Illuminate\Support\Facades\DB::table('branch_project')->delete();
            \Illuminate\Support\Facades\DB::table('pic_project')->delete();

            \Illuminate\Support\Facades\DB::statement('SET CONSTRAINTS ALL IMMEDIATE');

            // Delete storage files (documents, photos)
            \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory('documents');
            \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory('photos');
        });

        return Redirect::route('settings.index')->with('success', 'Semua data operasional berhasil dihapus.');
    }

    /**
     * Factory reset the entire system, leaving only the super admin.
     */
    public function resetSystem(Request $request)
    {
        if ($request->user()->role !== \App\Enums\UserRole::SUPER_ADMIN) {
            abort(403, 'Unauthorized action.');
        }

        $request->validate([
            'password' => 'required|current_password',
            'confirmation' => 'required|string|in:RESET',
        ]);

        $superAdminData = $request->user()->toArray();
        $superAdminPassword = $request->user()->getAuthPassword(); // getting the hashed password

        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--force' => true]);

        // Recreate the super admin precisely
        $newSuperAdmin = \App\Models\User::create([
            'name' => $superAdminData['name'],
            'email' => $superAdminData['email'],
            'password' => $superAdminPassword,
            'role' => \App\Enums\UserRole::SUPER_ADMIN,
        ]);

        // Ensure settings table exists implicitly by migrate:fresh, so we recreate defaults
        Setting::create([
            'key' => 'app_name',
            'value' => 'ARU HRIS',
            'group' => 'general'
        ]);

        // Clear all uploaded files
        \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory('documents');
        \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory('photos');

        // Log the user back in
        \Illuminate\Support\Facades\Auth::login($newSuperAdmin);

        return Redirect::route('settings.index')->with('success', 'Sistem berhasil di-reset ke pengaturan pabrik.');
    }
}
