<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class SettingController extends Controller
{
    /**
     * Default validation digit lengths for identity number fields.
     */
    private const DEFAULT_VALIDATION_DIGITS = [
        'ktp' => 16,
        'kk' => 16,
        'npwp' => 16,
        'bpjs_kes' => 13,
        'bpjs_tk' => 11,
        'prefix_max' => 5,
    ];

    /**
     * Default enum options for dropdown fields.
     */
    private const DEFAULT_VALIDATION_ENUMS = [
        'religion' => [
            ['value' => 'Islam', 'label' => 'Islam', 'enabled' => true],
            ['value' => 'Kristen', 'label' => 'Kristen', 'enabled' => true],
            ['value' => 'Katolik', 'label' => 'Katolik', 'enabled' => true],
            ['value' => 'Hindu', 'label' => 'Hindu', 'enabled' => true],
            ['value' => 'Buddha', 'label' => 'Buddha', 'enabled' => true],
            ['value' => 'Konghucu', 'label' => 'Konghucu', 'enabled' => true],
            ['value' => 'Lainnya', 'label' => 'Lainnya', 'enabled' => true],
        ],
        'education' => [
            ['value' => 'SD', 'label' => 'SD / Sederajat', 'enabled' => true],
            ['value' => 'SMP', 'label' => 'SMP / Sederajat', 'enabled' => true],
            ['value' => 'SMA/SMK', 'label' => 'SMA / SMK / Sederajat', 'enabled' => true],
            ['value' => 'D1', 'label' => 'Diploma 1 (D1)', 'enabled' => true],
            ['value' => 'D2', 'label' => 'Diploma 2 (D2)', 'enabled' => true],
            ['value' => 'D3', 'label' => 'Diploma 3 (D3)', 'enabled' => true],
            ['value' => 'D4', 'label' => 'Diploma 4 (D4)', 'enabled' => true],
            ['value' => 'S1', 'label' => 'Strata 1 (S1)', 'enabled' => true],
            ['value' => 'S2', 'label' => 'Strata 2 (S2)', 'enabled' => true],
            ['value' => 'S3', 'label' => 'Strata 3 (S3)', 'enabled' => true],
        ],
        'tax_status' => [
            ['value' => 'TK/0', 'label' => 'TK/0', 'enabled' => true],
            ['value' => 'TK/1', 'label' => 'TK/1', 'enabled' => true],
            ['value' => 'TK/2', 'label' => 'TK/2', 'enabled' => true],
            ['value' => 'TK/3', 'label' => 'TK/3', 'enabled' => true],
            ['value' => 'K/0', 'label' => 'K/0', 'enabled' => true],
            ['value' => 'K/1', 'label' => 'K/1', 'enabled' => true],
            ['value' => 'K/2', 'label' => 'K/2', 'enabled' => true],
            ['value' => 'K/3', 'label' => 'K/3', 'enabled' => true],
        ],
    ];

    /**
     * Retrieve the validation digits config from the database, with fallback to defaults.
     *
     * @return array
     */
    public static function getValidationDigits(): array
    {
        $raw = Setting::where('key', 'validation_digits')->value('value');
        $digits = $raw ? json_decode($raw, true) : null;
        return is_array($digits) ? array_merge(self::DEFAULT_VALIDATION_DIGITS, $digits) : self::DEFAULT_VALIDATION_DIGITS;
    }

    /**
     * Retrieve the validation enums config from the database, with fallback to defaults.
     *
     * @return array
     */
    public static function getValidationEnums(): array
    {
        $raw = Setting::where('key', 'validation_enums')->value('value');
        $enums = $raw ? json_decode($raw, true) : null;
        return is_array($enums) ? array_merge(self::DEFAULT_VALIDATION_ENUMS, $enums) : self::DEFAULT_VALIDATION_ENUMS;
    }

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
            'settings'          => $settings,
            'assetUrls'         => $assetUrls,
            'validationDigits'  => self::getValidationDigits(),
            'validationEnums'   => self::getValidationEnums(),
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
            'settings.validation_digits'        => ['nullable', function ($attr, $val, $fail) {
                if ($val !== null) {
                    $decoded = json_decode($val, true);
                    if (!is_array($decoded)) {
                        $fail('Format data digit validasi tidak valid.');
                        return;
                    }
                    foreach ($decoded as $key => $value) {
                        if (!is_int($value) || $value < 1 || $value > 50) {
                            $fail("Panjang digit untuk '{$key}' harus antara 1 dan 50.");
                        }
                    }
                }
            }],
            'settings.validation_enums'         => ['nullable', function ($attr, $val, $fail) {
                if ($val !== null) {
                    $decoded = json_decode($val, true);
                    if (!is_array($decoded)) {
                        $fail('Format data enum validasi tidak valid.');
                        return;
                    }
                    foreach ($decoded as $category => $items) {
                        if (!is_array($items) || empty($items)) {
                            $fail("Kategori '{$category}' harus memiliki setidaknya satu opsi.");
                        }
                    }
                }
            }],
            'settings.*'                        => 'nullable|string',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            if (str_starts_with($key, 'document_')) {
                $group = 'documents';
            } elseif (str_starts_with($key, 'validation_')) {
                $group = 'validation';
            } elseif (str_starts_with($key, 'reminder_')) {
                $group = 'reminders';
            } else {
                $group = 'general';
            }
            Setting::updateOrCreate(
                ['key' => $key, 'role_specifier' => null],
                ['value' => $value, 'group' => $group]
            );
        }

        \App\Models\AuditLog::log('settings', 'settings', "Memperbarui pengaturan sistem", ['keys' => array_keys($validated['settings'])]);

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

        // If the uploaded asset is the logo, also generate the favicon (safely for shared hosting)
        if ($type === 'logo') {
            try {
                $faviconPath = public_path('favicon.ico');
                if (function_exists('exec')) {
                    $disabled = explode(',', ini_get('disable_functions'));
                    if (!in_array('exec', array_map('trim', $disabled))) {
                        exec('convert ' . escapeshellarg($fullPath) . ' -define icon:auto-resize=64,48,32,16 ' . escapeshellarg($faviconPath));
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Gagal generate favicon: " . $e->getMessage());
            }
        }

        // Persist path in settings
        Setting::updateOrCreate(
            ['key' => 'asset_' . $type, 'role_specifier' => null],
            ['value' => 'assets/' . $filename, 'group' => 'assets']
        );

        \App\Models\AuditLog::log('upload', 'settings', "Mengunggah aset perusahaan ({$type})", ['type' => $type]);

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

        \App\Models\AuditLog::log('settings', 'settings', "Melakukan penghapusan seluruh data operasional");

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

        \App\Models\AuditLog::log('settings', 'settings', "Melakukan Factory Reset sistem");

        return Redirect::route('settings.index')->with('success', 'Sistem berhasil di-reset ke pengaturan pabrik.');
    }
}
