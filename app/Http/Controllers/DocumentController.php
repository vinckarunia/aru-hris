<?php

namespace App\Http\Controllers;

use App\Enums\DocumentType;
use App\Models\Document;
use App\Models\Setting;
use App\Models\Worker;
use App\Enums\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Class DocumentController
 *
 * Handles upload, download, deletion, and verification of worker identity documents.
 *
 * ## Document Settings
 * File constraints (max size, allowed mimes) and active document types are read at runtime
 * from the `settings` table (keys: `document_max_size_kb`, `document_allowed_mimes`,
 * `document_types`). Administrators can change these from the System Settings page
 * without any code or deployment changes.
 *
 * ## Scalability
 * Adding a new document type from the Settings UI automatically makes it valid here,
 * because validation reads from the DB-stored `document_types` JSON at runtime.
 * Optionally, a matching case can be added to {@see \App\Enums\DocumentType} for type-safety.
 *
 * ## Cloud Storage Transition
 * This controller resolves the storage disk at runtime:
 * ```php
 * Storage::disk(config('filesystems.default'))
 * ```
 * To switch to cloud storage (e.g. S3):
 *   1. Configure the disk in `config/filesystems.php`.
 *   2. Set `FILESYSTEM_DISK=s3` in `.env`.
 *   3. No controller code changes required.
 *
 * @package App\Http\Controllers
 */
class DocumentController extends Controller
{
    /**
     * Resolve the configured storage disk at runtime.
     * Override via the `FILESYSTEM_DISK` environment variable.
     */
    private function disk()
    {
        return Storage::disk(config('filesystems.default'));
    }

    /**
     * Load and parse document-related settings from the database.
     * Returns defaults when settings have not been configured yet.
     *
     * @return array{maxKb: int, mimes: string, allowedTypes: string[]}
     */
    private function documentSettings(): array
    {
        $settings = Setting::whereIn('key', [
            'document_max_size_kb',
            'document_allowed_mimes',
            'document_types',
        ])->pluck('value', 'key');

        $maxKb = (int) ($settings->get('document_max_size_kb') ?? 5120);
        $mimes = $settings->get('document_allowed_mimes') ?? 'pdf,jpg,jpeg,png';

        $typesJson = $settings->get('document_types');
        if ($typesJson) {
            $decoded = json_decode($typesJson, true) ?? [];
            $allowedTypes = collect($decoded)
                ->where('enabled', true)
                ->pluck('value')
                ->all();
        } else {
            $allowedTypes = DocumentType::values();
        }

        return compact('maxKb', 'mimes', 'allowedTypes');
    }

    /**
     * Store a newly uploaded document for the given worker.
     *
     * File constraints (size, allowed formats) and valid document types are read from
     * the system settings at runtime, so they can be changed from the Settings UI
     * without redeploying. Existing documents of the same type are replaced automatically.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Worker        $worker
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request, Worker $worker): RedirectResponse
    {
        $settings = $this->documentSettings();

        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in($settings['allowedTypes'])],
            'file' => ['required', 'file', 'mimes:' . $settings['mimes'], 'max:' . $settings['maxKb']],
        ], [
            'type.in'       => 'Jenis dokumen tidak valid atau belum diaktifkan.',
            'file.required' => 'File dokumen wajib diunggah.',
            'file.mimes'    => 'Format file tidak diizinkan. Format yang diterima: ' . strtoupper(str_replace(',', ', ', $settings['mimes'])) . '.',
            'file.max'      => 'Ukuran file melebihi batas maksimum (' . round($settings['maxKb'] / 1024, 1) . ' MB).',
        ]);

        // Replace existing document of the same type (one document per type per worker)
        $existing = Document::where('worker_id', $worker->id)
            ->where('type', $validated['type'])
            ->first();

        if ($existing) {
            $this->disk()->delete($existing->file_path);
            $existing->delete();
        }

        $path = $request->file('file')->store(
            "documents/worker_{$worker->id}",
            config('filesystems.default')
        );

        Document::create([
            'worker_id' => $worker->id,
            'type'      => $validated['type'],
            'file_path' => $path,
        ]);

        return redirect()->back()->with('success', 'Dokumen berhasil diunggah.');
    }

    /**
     * Remove the specified document from storage and database.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Document      $document
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Request $request, Document $document): RedirectResponse
    {
        $this->disk()->delete($document->file_path);
        $document->delete();

        return redirect()->back()->with('success', 'Dokumen berhasil dihapus.');
    }

    /**
     * Stream the specified document as a file download.
     *
     * @param  \App\Models\Document  $document
     * @return \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\RedirectResponse
     */
    public function download(Document $document): StreamedResponse|RedirectResponse
    {
        if (! $this->disk()->exists($document->file_path)) {
            return redirect()->back()->withErrors(['file' => 'File tidak ditemukan di server.']);
        }

        $typeLabel = DocumentType::tryFrom($document->type)?->shortLabel() ?? $document->type;
        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);

        // Use worker name for the filename (spaces replaced with underscores)
        $document->loadMissing('worker');
        $workerName = preg_replace('/\s+/', '_', $document->worker?->name ?? 'worker');
        $filename   = "{$typeLabel}_{$workerName}.{$extension}";

        return $this->disk()->download($document->file_path, $filename);
    }

    /**
     * Toggle the verification status of the specified document.
     *
     * Access rules:
     * - **Admin ARU / Super Admin**: may verify any document.
     * - **PIC**: may verify only documents belonging to workers with an active assignment
     *   in one of the PIC's managed projects.
     * - **Worker**: forbidden (403).
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Document      $document
     * @return \Illuminate\Http\RedirectResponse
     */
    public function verify(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();

        if ($user->isWorker()) {
            abort(403, 'Akses ditolak.');
        }

        if ($user->isPic()) {
            $projectIds = $user->pic
                ? $user->pic->projects()->pluck('projects.id')->toArray()
                : [];

            $workerInProject = $document->worker?->assignments()
                ->whereIn('status', ['active', 'probation', 'extended'])
                ->whereIn('project_id', $projectIds)
                ->exists();

            if (! $workerInProject) {
                abort(403, 'Akses ditolak. Karyawan ini tidak berada di project Anda.');
            }
        }

        // Toggle: if already verified → unverify; otherwise → verify now
        if ($document->verified_at) {
            $document->update(['verified_at' => null]);
            $message = 'Verifikasi dokumen berhasil dibatalkan.';
        } else {
            $document->update(['verified_at' => now()]);
            $message = 'Dokumen berhasil diverifikasi.';
        }

        return redirect()->back()->with('success', $message);
    }
}
