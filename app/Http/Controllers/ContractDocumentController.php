<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\InternalEmployee;
use App\Models\Assignment;
use Illuminate\Http\Request;
use App\Services\DocumentParserService;
use App\Services\GooglePdfConverterService;

class ContractDocumentController extends Controller
{
    protected $parserService;
    protected $pdfConverterService;

    public function __construct(DocumentParserService $parserService, GooglePdfConverterService $pdfConverterService)
    {
        $this->parserService = $parserService;
        $this->pdfConverterService = $pdfConverterService;
    }

    /**
     * Download the PKWT document.
     */
    public function downloadPkwt(Request $request, Contract $contract)
    {
        $user = $request->user();

        $contract->load(['compensation', 'assignment.worker', 'assignment.project.client', 'assignment.branches', 'assignment.project.templateKontrak', 'assignment.project.templateHarian', 'assignment.project.templatePartTime']);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Kontrak ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Mengunduh kontrak hanya diperbolehkan untuk Admin dan PIC project terkait.');
        }
        
        $pihakPertama = ($user->internalEmployee ?? null)
            ?? InternalEmployee::where('name', 'JUMAGA TUA SINAGA')->first()
            ?? InternalEmployee::where('position', 'Head of Operation')->first()
            ?? InternalEmployee::first();

        // Calculate sequence for old and new logic
        $contractMonth = $contract->start_date ? \Carbon\Carbon::parse($contract->start_date) : now();
        $pkwtMonthlySeq = Contract::whereYear('start_date', $contractMonth->year)
            ->whereMonth('start_date', $contractMonth->month)
            ->where('id', '<=', $contract->id)
            ->count();
            
        $seqFormatted     = str_pad($pkwtMonthlySeq, 3, '0', STR_PAD_LEFT);
        $pkwtNumFormatted = str_pad($contract->pkwt_number ?? 1, 3, '0', STR_PAD_LEFT);
        $romanMonths  = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $issueDate    = $contract->start_date ? \Carbon\Carbon::parse($contract->start_date) : now();
        $romanMonth   = $romanMonths[$issueDate->month] ?? 'I';
        $year         = $issueDate->year;
        
        // Determine if we should use DB Template or fallback Blade
        $project = $contract->assignment->project;
        $contractType = strtolower($contract->contract_type);
        
        $prefix = in_array($contractType, ['harian', 'part-time']) ? 'PKPH' : 'PKWT';
        $nomorSurat = sprintf('%s/ARU/%s-%s/%s/%s', $seqFormatted, $prefix, $pkwtNumFormatted, $romanMonth, $year);


        
        $template = null;
        if ($contractType === 'harian') {
            $template = $project->templateHarian;
        } elseif ($contractType === 'part-time') {
            $template = $project->templatePartTime;
        } else {
            $template = $project->templateKontrak;
        }

        $contractTypeMapped = match ($contractType) {
            'harian' => 'kontrak_harian',
            'part-time' => 'kontrak_part_time',
            default => 'kontrak_pkwt',
        };

        if (!$template) {
            $template = \App\Models\DocumentTemplate::where('type', $contractTypeMapped)->where('is_default', true)->first();
        }

        if (!$template || !$template->file_path || !\Storage::disk('local')->exists($template->file_path)) {
            return back()->with('error', 'Template DOCX belum dikonfigurasi untuk proyek ini dan tidak ada template default.');
        }

        $parsedData = $this->parserService->getRealData($contract, $contract->assignment, $pihakPertama, $nomorSurat);
        
        $workerName = $contract->assignment->worker->name ?? 'Unknown';
        $outputPath = storage_path('app/temp_' . uniqid() . '.docx');
        
        $this->parserService->generateDocx(\Storage::disk('local')->path($template->file_path), $parsedData, $outputPath);
        
        // Convert to PDF if enabled
        if (config('services.google.pdf_conversion_enabled')) {
            $pdfOutputPath = storage_path('app/temp_' . uniqid() . '.pdf');
            $converted = $this->pdfConverterService->convertDocxToPdf($outputPath, $pdfOutputPath);

            if ($converted && file_exists($pdfOutputPath)) {
                if (file_exists($outputPath)) {
                    @unlink($outputPath);
                }
                
                \App\Models\AuditLog::log('download', 'contract', "Mengunduh Kontrak (PDF) untuk karyawan: {$workerName}", [
                    'contract_id' => $contract->id,
                    'document_type' => $prefix,
                    'worker_name' => $workerName,
                    'used_template' => 'DOCX_TEMPLATE_TO_PDF'
                ]);

                $fileName = "{$prefix} - {$workerName}.pdf";
                return response()->download($pdfOutputPath, $fileName)->deleteFileAfterSend(true);
            }

            \Illuminate\Support\Facades\Log::warning("Google Docs PDF Conversion failed. Falling back to DOCX for: {$workerName}");
        }

        $fileName = "{$prefix} - {$workerName}.docx";
        
        \App\Models\AuditLog::log('download', 'contract', "Mengunduh Kontrak untuk karyawan: {$workerName}", [
            'contract_id' => $contract->id,
            'document_type' => $prefix,
            'worker_name' => $workerName,
            'used_template' => 'DOCX_TEMPLATE'
        ]);

        return response()->download($outputPath, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Download the Surat Tugas document (PDF).
     */
    public function downloadSuratTugas(Request $request, Contract $contract)
    {
        $user = $request->user();

        $contract->load(['compensation', 'assignment.worker', 'assignment.project.client', 'assignment.branches', 'assignment.project.templateSuratTugas']);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Surat tugas ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Mengunduh surat tugas hanya diperbolehkan untuk Admin dan PIC project terkait.');
        }
        
        $pihakPertama = ($user->internalEmployee ?? null)
            ?? InternalEmployee::where('name', 'JUMAGA TUA SINAGA')->first()
            ?? InternalEmployee::where('position', 'Head of Operation')->first()
            ?? InternalEmployee::first();

        $template = $contract->assignment->project->templateSuratTugas ?? null;
        
        // Compute basic SP nomor for Surat Tugas
        $seqFormatted = str_pad($contract->id, 3, '0', STR_PAD_LEFT);
        $romanMonths  = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $monthRom = $romanMonths[(int)\Carbon\Carbon::now()->format('n')];
        $year = \Carbon\Carbon::now()->year;
        $nomorSurat = "ST-{$seqFormatted}/ARU/{$monthRom}/{$year}";

        if (!$template) {
            $template = \App\Models\DocumentTemplate::where('type', 'surat_tugas')->where('is_default', true)->first();
        }

        if (!$template || !$template->file_path || !\Storage::disk('local')->exists($template->file_path)) {
            return back()->with('error', 'Template DOCX Surat Tugas belum dikonfigurasi untuk proyek ini dan tidak ada template default.');
        }

        $parsedData = $this->parserService->getRealData($contract, $contract->assignment, $pihakPertama, $nomorSurat, 'docx');
        $workerName = $contract->assignment->worker->name ?? 'Unknown';
        $outputPath = storage_path('app/temp_st_' . uniqid() . '.docx');
        
        $this->parserService->generateDocx(\Storage::disk('local')->path($template->file_path), $parsedData, $outputPath);
        
        // Convert to PDF if enabled
        if (config('services.google.pdf_conversion_enabled')) {
            $pdfOutputPath = storage_path('app/temp_st_' . uniqid() . '.pdf');
            $converted = $this->pdfConverterService->convertDocxToPdf($outputPath, $pdfOutputPath);

            if ($converted && file_exists($pdfOutputPath)) {
                if (file_exists($outputPath)) {
                    @unlink($outputPath);
                }

                \App\Models\AuditLog::log('download', 'contract', "Mengunduh Surat Tugas (PDF) untuk karyawan: {$workerName}", [
                    'contract_id' => $contract->id,
                    'document_type' => 'Surat Tugas',
                    'worker_name' => $workerName,
                    'used_template' => 'DOCX_TEMPLATE_TO_PDF'
                ]);

                $fileName = 'Surat Tugas - ' . $workerName . '.pdf';
                return response()->download($pdfOutputPath, $fileName)->deleteFileAfterSend(true);
            }

            \Illuminate\Support\Facades\Log::warning("Google Docs PDF Conversion failed. Falling back to DOCX for ST: {$workerName}");
        }

        $fileName = 'Surat Tugas - ' . $workerName . '.docx';
        
        \App\Models\AuditLog::log('download', 'contract', "Mengunduh Surat Tugas untuk karyawan: {$workerName}", [
            'contract_id' => $contract->id,
            'document_type' => 'Surat Tugas',
            'worker_name' => $workerName,
            'used_template' => 'DOCX_TEMPLATE'
        ]);

        return response()->download($outputPath, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Download the Paklaring (Surat Keterangan Kerja) document.
     */
    public function downloadPaklaring(Request $request, Assignment $assignment)
    {
        $user = $request->user();

        $assignment->load(['worker', 'project.client', 'branches', 'project.templatePaklaringA', 'project.templatePaklaringB']);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Penempatan ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Mengunduh paklaring hanya diperbolehkan untuk Admin dan PIC project terkait.');
        }
        
        if (!$assignment->equipment_returned) {
            abort(403, 'Gagal mengunduh: Perangkat kerja belum dikembalikan.');
        }

        $grade = '';
        if ($assignment->status === 'contract expired' || $assignment->status === 'project closed') {
            $grade = 'A';
        } elseif ($assignment->status === 'resign') {
            $grade = 'B';
        } else {
            abort(403, 'Gagal mengunduh: Status penempatan harus Resign, Contract Expired, atau Project Closed untuk mencetak Paklaring.');
        }

        $pihakPertama = ($user->internalEmployee ?? null)
            ?? InternalEmployee::where('name', 'JUMAGA TUA SINAGA')->first()
            ?? InternalEmployee::where('position', 'Head of Operation')->first()
            ?? InternalEmployee::first();

        // Format based on image: No. : 081/ARU/Pers-SKK/IV/2026
        $sequence = str_pad($assignment->id, 3, '0', STR_PAD_LEFT);
        $romanMonths = [1=>'I', 2=>'II', 3=>'III', 4=>'IV', 5=>'V', 6=>'VI', 7=>'VII', 8=>'VIII', 9=>'IX', 10=>'X', 11=>'XI', 12=>'XII'];
        $monthRom = $romanMonths[(int)\Carbon\Carbon::now()->format('n')];
        $year = \Carbon\Carbon::now()->year;
        $nomorSurat = "{$sequence}/ARU/Pers-SKK/{$monthRom}/{$year}";

        $template = $grade === 'A' ? $assignment->project->templatePaklaringA : $assignment->project->templatePaklaringB;
        $templateTypeStr = $grade === 'A' ? 'paklaring_a' : 'paklaring_b';

        if (!$template) {
            $template = \App\Models\DocumentTemplate::where('type', $templateTypeStr)->where('is_default', true)->first();
        }

        if (!$template || !$template->file_path || !\Storage::disk('local')->exists($template->file_path)) {
            return back()->with('error', "Template DOCX Paklaring {$grade} belum dikonfigurasi untuk proyek ini dan tidak ada template default.");
        }

        $parsedData = $this->parserService->getRealData(null, $assignment, $pihakPertama, $nomorSurat, 'docx');
        $workerName = $assignment->worker->name ?? 'Unknown';
        $outputPath = storage_path('app/temp_paklaring_' . uniqid() . '.docx');
        
        $this->parserService->generateDocx(\Storage::disk('local')->path($template->file_path), $parsedData, $outputPath);
        
        // Convert to PDF if enabled
        if (config('services.google.pdf_conversion_enabled')) {
            $pdfOutputPath = storage_path('app/temp_paklaring_' . uniqid() . '.pdf');
            $converted = $this->pdfConverterService->convertDocxToPdf($outputPath, $pdfOutputPath);

            if ($converted && file_exists($pdfOutputPath)) {
                if (file_exists($outputPath)) {
                    @unlink($outputPath);
                }

                \App\Models\AuditLog::log('download', 'assignment', "Mengunduh Paklaring (Grade {$grade} - PDF) untuk karyawan: {$workerName}", [
                    'assignment_id' => $assignment->id,
                    'document_type' => 'Paklaring',
                    'grade'         => $grade,
                    'used_template' => 'DOCX_TEMPLATE_TO_PDF'
                ]);

                $fileName = 'Paklaring - ' . $workerName . '.pdf';
                return response()->download($pdfOutputPath, $fileName)->deleteFileAfterSend(true);
            }

            \Illuminate\Support\Facades\Log::warning("Google Docs PDF Conversion failed. Falling back to DOCX for Paklaring: {$workerName}");
        }

        $fileName = 'Paklaring - ' . $workerName . '.docx';
        
        \App\Models\AuditLog::log('download', 'assignment', "Mengunduh Paklaring (Grade {$grade}) untuk karyawan: {$workerName}", [
            'assignment_id' => $assignment->id,
            'document_type' => 'Paklaring',
            'grade'         => $grade,
            'used_template' => 'DOCX_TEMPLATE'
        ]);

        return response()->download($outputPath, $fileName)->deleteFileAfterSend(true);
    }
}
