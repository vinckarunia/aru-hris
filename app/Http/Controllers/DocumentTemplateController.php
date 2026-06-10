<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DocumentTemplate;
use App\Services\DocumentParserService;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Exception;

class DocumentTemplateController extends Controller
{
    protected $parserService;

    public function __construct(DocumentParserService $parserService)
    {
        $this->parserService = $parserService;
    }

    /**
     * Display a listing of global document templates.
     */
    public function index()
    {
        // Only show global templates (project_id is null) for the Admin Control Room
        $templates = DocumentTemplate::whereNull('project_id')->get();
        
        return Inertia::render('DocumentTemplate/Index', [
            'templates' => $templates
        ]);
    }

    /**
     * Show the form for creating a new template.
     */
    public function create()
    {
        return Inertia::render('DocumentTemplate/Form');
    }

    /**
     * Store a newly created template in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string',
            'file' => 'required|file|mimes:docx|max:10240', // Max 10MB
            'project_id' => 'nullable|exists:projects,id',
        ]);

        try {
            $file = $request->file('file');
            
            // Store the uploaded DOCX file natively
            $storedPath = $file->store('documents/templates', 'local');

            $template = DocumentTemplate::create([
                'name' => $request->name,
                'type' => $request->type,
                'project_id' => $request->project_id,
                'file_path' => $storedPath,
                'is_active' => true,
            ]);

            return back()->with('success', 'Template berhasil diunggah dan di-parse.');
        } catch (Exception $e) {
            return back()->with('error', 'Gagal memproses dokumen: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified template.
     */
    public function edit(DocumentTemplate $documentTemplate)
    {
        return Inertia::render('DocumentTemplate/Edit', [
            'template' => $documentTemplate
        ]);
    }

    /**
     * Update the specified template in storage.
     */
    public function update(Request $request, DocumentTemplate $documentTemplate)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string',
            'file' => 'nullable|file|mimes:docx|max:10240', // Max 10MB
        ]);

        $updateData = [
            'name' => $request->name,
            'type' => $request->type,
        ];

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            
            // Store the uploaded DOCX file natively
            $storedPath = $file->store('documents/templates', 'local');
            $updateData['file_path'] = $storedPath;
            
            // Optionally remove old file? 
            if ($documentTemplate->file_path && \Storage::disk('local')->exists($documentTemplate->file_path)) {
                \Storage::disk('local')->delete($documentTemplate->file_path);
            }
        }

        $documentTemplate->update($updateData);

        return back()->with('success', 'Template berhasil diperbarui.');
    }

    public function destroy(Request $request, DocumentTemplate $documentTemplate)
    {
        if ($request->user()->isPic()) {
            abort(403, 'Akses ditolak. PIC tidak dapat menghapus template dokumen.');
        }

        // Prevent deleting fixed types if needed, though they shouldn't be deleted if in use.
        if (in_array($documentTemplate->type, [DocumentTemplate::TYPE_PAKLARING_A, DocumentTemplate::TYPE_PAKLARING_B])) {
            // Optional: Block deletion of Paklaring if it's the last one? 
            // We'll let admin delete, they can re-upload.
        }

        $documentTemplate->delete();

        return back()->with('success', 'Template berhasil dihapus.');
    }

    public function preview(DocumentTemplate $documentTemplate)
    {
        $dummyData = $this->parserService->getDummyData();

        try {
            if (!$documentTemplate->file_path || !\Storage::disk('local')->exists($documentTemplate->file_path)) {
                return response('Error: File DOCX tidak ditemukan.', 404);
            }

            $outputPath = storage_path('app/preview_' . uniqid() . '.docx');
            
            $this->parserService->generateDocx(\Storage::disk('local')->path($documentTemplate->file_path), $dummyData, $outputPath);
            
            return response()->download($outputPath, 'Preview - ' . $documentTemplate->name . '.docx')->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response('Error Rendering Document: ' . $e->getMessage(), 500);
        }
    }
    public function toggleDefault(Request $request, DocumentTemplate $documentTemplate)
    {
        $request->validate([
            'is_default' => 'required|boolean',
        ]);

        // Optional: If we only allow 1 default per type, we can unset others here
        if ($request->is_default) {
            DocumentTemplate::where('type', $documentTemplate->type)
                ->where('id', '!=', $documentTemplate->id)
                ->update(['is_default' => false]);
        }

        $documentTemplate->update([
            'is_default' => $request->is_default,
        ]);

        return back()->with('success', 'Status default template berhasil diperbarui.');
    }
}
