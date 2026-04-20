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
        
        $assetUrls = [
            'logo'      => $settings->get('asset_logo')      ? asset('uploads/' . $settings->get('asset_logo'))      : null,
            'signature' => $settings->get('asset_signature') ? asset('uploads/' . $settings->get('asset_signature')) : null,
        ];
        
        return Inertia::render('Settings/Index', [
            'settings'  => $settings,
            'assetUrls' => $assetUrls,
        ]);
    }

    /**
     * Update the system settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings'                          => 'required|array',
            'settings.document_types'           => ['nullable', function ($attr, $val, $fail) {
                if ($val !== null && json_decode($val) === null) {
                    $fail('Format data jenis dokumen tidak valid.');
                }
            }],
            'settings.*'                        => 'nullable|string',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            $group = str_starts_with($key, 'document_') ? 'documents' : 'general';
            Setting::updateOrCreate(
                ['key' => $key, 'role_specifier' => null],
                ['value' => $value, 'group' => $group]
            );
        }

        return Redirect::route('settings.index')->with('success', 'Pengaturan sistem berhasil diperbarui.');
    }

    /**
     * Upload a company asset (logo or signature/stamp) as PNG.
     * Automatically removes the white background using GD, producing a transparent PNG.
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function uploadAsset(Request $request): \Illuminate\Http\RedirectResponse
    {
        $request->validate([
            'asset_type' => 'required|in:logo,signature',
            'asset_file' => 'required|file|mimes:png,jpg,jpeg|max:2048',
        ]);

        $type = $request->input('asset_type');
        $file = $request->file('asset_file');

        // Load source image
        $mime = $file->getMimeType();
        if (str_contains($mime, 'jpeg') || str_contains($mime, 'jpg')) {
            $src = imagecreatefromjpeg($file->getRealPath());
        } else {
            $src = imagecreatefrompng($file->getRealPath());
        }

        // Scale down to max 800px on either side BEFORE pixel processing
        // This cuts the loop from millions to tens-of-thousands of iterations.
        $maxDim = 800;
        $origW = imagesx($src);
        $origH = imagesy($src);
        if ($origW > $maxDim || $origH > $maxDim) {
            $scale = min($maxDim / $origW, $maxDim / $origH);
            $src = imagescale($src, (int) ($origW * $scale), (int) ($origH * $scale));
        }

        $w = imagesx($src);
        $h = imagesy($src);

        // Create output canvas with alpha channel support
        $dst = imagecreatetruecolor($w, $h);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefill($dst, 0, 0, $transparent);
        imagealphablending($dst, true);

        // Copy source onto canvas
        imagecopy($dst, $src, 0, 0, 0, 0, $w, $h);

        // Remove near-white pixels (threshold: each channel >= 230)
        $threshold = 230;
        for ($x = 0; $x < $w; $x++) {
            for ($y = 0; $y < $h; $y++) {
                $color = imagecolorat($dst, $x, $y);
                $colors = imagecolorsforindex($dst, $color);
                
                if ($colors['red'] >= $threshold && $colors['green'] >= $threshold && $colors['blue'] >= $threshold) {
                    imagesetpixel($dst, $x, $y, $transparent);
                }
            }
        }

        imagealphablending($dst, false);
        imagesavealpha($dst, true);

        // Save to public/uploads/assets/
        $dir = public_path('uploads/assets');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $filename = $type . '.png';
        $fullPath = $dir . '/' . $filename;
        imagepng($dst, $fullPath);

        imagedestroy($src);
        imagedestroy($dst);

        // If the uploaded asset is the logo, also generate the favicon
        if ($type === 'logo') {
            $faviconPath = public_path('favicon.ico');
            exec('convert ' . escapeshellarg($fullPath) . ' -define icon:auto-resize=64,48,32,16 ' . escapeshellarg($faviconPath));
        }

        // Persist path in settings
        Setting::updateOrCreate(
            ['key' => 'asset_' . $type, 'role_specifier' => null],
            ['value' => 'assets/' . $filename, 'group' => 'assets']
        );

        return Redirect::route('settings.index')->with('success', ucfirst($type) . ' berhasil diunggah dan background dihapus.');
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
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0');
            
            // Clear operational data using delete() to respect model events and observers.
            \App\Models\ContractCompensation::query()->delete();
            \App\Models\Contract::query()->delete();
            \App\Models\Assignment::query()->delete();
            \App\Models\Worker::query()->delete();
            \App\Models\Pic::query()->delete();
            \App\Models\Project::query()->delete();
            \App\Models\Branch::query()->delete();
            \App\Models\Client::query()->delete();
            \App\Models\FamilyMember::query()->delete();
            \App\Models\DataRequest::query()->delete();
            \App\Models\Document::query()->delete();
            \App\Models\Reminder::query()->delete();
            
            \Illuminate\Support\Facades\DB::table('branch_project')->delete();
            \Illuminate\Support\Facades\DB::table('pic_project')->delete();

            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1');

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

        // Recreate default settings
        Setting::create(['key' => 'app_name', 'value' => 'ARU HRIS', 'group' => 'general']);

        // Default document settings
        $defaultDocTypes = json_encode([
            ['value' => 'KTP', 'label' => 'Kartu Tanda Penduduk (KTP)', 'enabled' => true],
            ['value' => 'KK',  'label' => 'Kartu Keluarga (KK)',        'enabled' => true],
        ]);
        Setting::create(['key' => 'document_max_size_kb',    'value' => '5120',          'group' => 'documents']);
        Setting::create(['key' => 'document_allowed_mimes',  'value' => 'pdf,jpg,jpeg,png', 'group' => 'documents']);
        Setting::create(['key' => 'document_types',          'value' => $defaultDocTypes,  'group' => 'documents']);

        // Clear all uploaded files
        \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory('documents');
        \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory('photos');

        // Default Reminder Settings
        Setting::create(['key' => 'reminder_contract_expiry_enabled', 'value' => '1',  'group' => 'reminders']);
        Setting::create(['key' => 'reminder_contract_expiry_days',    'value' => '30', 'group' => 'reminders']);
        Setting::create(['key' => 'reminder_bpjs_incomplete_enabled', 'value' => '1',  'group' => 'reminders']);
        Setting::create(['key' => 'reminder_client_mou_expiry_enabled', 'value' => '1', 'group' => 'reminders']);
        Setting::create(['key' => 'reminder_client_mou_expiry_days', 'value' => '30', 'group' => 'reminders']);

        // Log the user back in
        \Illuminate\Support\Facades\Auth::login($newSuperAdmin);

        return Redirect::route('settings.index')->with('success', 'Sistem berhasil di-reset ke pengaturan pabrik.');
    }
}
