<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\DocumentTemplate;
use App\Services\DocumentParserService;

class ProjectTemplateController extends Controller
{
    protected $parserService;

    public function __construct(DocumentParserService $parserService)
    {
        $this->parserService = $parserService;
    }

    /**
     * Store a custom template uploaded by a PIC for a specific project.
     */
    public function store(Request $request, Project $project)
    {
        $user = $request->user();
        
        // Ensure PIC has access to this project
        if ($user->isPic()) {
            if (!$project->pics->contains('id', $user->pic?->id)) {
                abort(403, 'Akses ditolak. Anda bukan PIC untuk project ini.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403);
        }

        $request->validate([
            'type' => 'required|string',
            'file' => 'required|file|mimes:docx|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            
            // Store the uploaded DOCX file
            $storedPath = $file->store('documents/templates', 'local');

            $template = DocumentTemplate::create([
                'name' => 'Custom ' . ucfirst(str_replace('_', ' ', $request->type)) . ' - ' . $project->name,
                'type' => $request->type,
                'project_id' => $project->id,
                'file_path' => $storedPath,
                'is_active' => true,
            ]);

            // Automatically assign to project
            $field = 'template_' . $request->type . '_id';
            $project->update([
                $field => $template->id,
            ]);

            return back()->with('success', 'Template kustom berhasil diunggah.');
        } catch (\Exception $e) {
            return back()->with('error', 'Gagal memproses dokumen: ' . $e->getMessage());
        }
    }
}
