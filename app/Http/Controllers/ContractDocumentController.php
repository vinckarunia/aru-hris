<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\InternalEmployee;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpWord\TemplateProcessor;

class ContractDocumentController extends Controller
{
    /**
     * Download the PKWT document.
     *
     * @param Request $request
     * @param Contract $contract
     */
    public function downloadPkwt(Request $request, Contract $contract)
    {
        $contract->load(['compensation', 'assignment.worker', 'assignment.project.client', 'assignment.branch']);
        
        $user = $request->user();
        
        // Pihak Pertama: Use the logged-in ARU user's linked InternalEmployee profile.
        // Falls back to name search, then position search, then any first employee.
        $pihakPertama = ($user->internalEmployee ?? null)
            ?? InternalEmployee::where('name', 'JUMAGA TUA SINAGA')->first()
            ?? InternalEmployee::where('position', 'Head of Operation')->first()
            ?? InternalEmployee::first();
            
        $format = $request->query('format', 'pdf');
        
        $data = [
            'contract'      => $contract,
            'worker'        => $contract->assignment->worker,
            'pihakPertama'  => $pihakPertama,
            'logoPath'      => $this->getAssetPath('logo'),
            'signaturePath' => $this->getAssetPath('signature'),
        ];
        
        if ($format === 'docx') {
            return $this->generatePkwtDocx($data);
        }
        
        return $this->generatePkwtPdf($data);
    }

    /**
     * Download the Surat Tugas document (PDF).
     */
    public function downloadSuratTugas(Request $request, Contract $contract)
    {
        $contract->load(['compensation', 'assignment.worker', 'assignment.project.client', 'assignment.branch']);
        
        $user = $request->user();
        
        // Pihak Pertama: Use the logged-in ARU user's linked InternalEmployee profile.
        // Falls back to name search, then position search, then any first employee.
        $pihakPertama = ($user->internalEmployee ?? null)
            ?? InternalEmployee::where('name', 'JUMAGA TUA SINAGA')->first()
            ?? InternalEmployee::where('position', 'Head of Operation')->first()
            ?? InternalEmployee::first();
            
        $data = [
            'contract'      => $contract,
            'worker'        => $contract->assignment->worker,
            'pihakPertama'  => $pihakPertama,
            'logoPath'      => $this->getAssetPath('logo'),
            'signaturePath' => $this->getAssetPath('signature'),
        ];
        
        $pdf = Pdf::loadView('pdf.surat-tugas', $data)->setPaper('a4', 'portrait');
        $fileName = 'Surat Tugas - ' . ($data['worker']->name ?? 'Worker') . '.pdf';
        
        return $pdf->download($fileName);
    }

    /**
     * Get absolute filesystem path to a stored company asset.
     * Returns null if not yet uploaded.
     *
     * @param string $type 'logo' or 'signature'
     * @return string|null
     */
    private function getAssetPath(string $type): ?string
    {
        $setting = \App\Models\Setting::where('key', 'asset_' . $type)->value('value');
        if (!$setting) return null;
        $path = storage_path('app/public/' . $setting);
        return file_exists($path) ? $path : null;
    }

    /**
     * Generate PKWT as PDF
     */
    private function generatePkwtPdf(array $data)
    {
        $pdf = Pdf::loadView('pdf.pkwt', $data)
                  ->setPaper('a4', 'portrait');

        $fileName = 'PKWT - ' . ($data['worker']->name ?? 'Worker') . '.pdf';
        
        return $pdf->download($fileName);
    }
    
    /**
     * Generate PKWT as DOCX
     */
    private function generatePkwtDocx(array $data)
    {
        $templatePath = storage_path('app/templates/pkwt_template.docx');
        
        if (!file_exists($templatePath)) {
            // If template does not exist, fallback or throw error.
            abort(404, 'Template DOCX belum tersedia di server.');
        }

        $templateProcessor = new TemplateProcessor($templatePath);
        
        /** @var \App\Models\Worker $worker */
        $worker = $data['worker'];
        /** @var \App\Models\InternalEmployee $pihakPertama */
        $pihakPertama = $data['pihakPertama'];
        /** @var \App\Models\Contract $contract */
        $contract = $data['contract'];
        
        // Replace values
        // Pihak Pertama
        $templateProcessor->setValue('pihak1_nama', $pihakPertama?->name ?? '-');
        $templateProcessor->setValue('pihak1_alamat', $pihakPertama?->address_ktp ?? '-');
        $templateProcessor->setValue('pihak1_jabatan', $pihakPertama?->position ?? '-');
        
        // Pihak Kedua
        $templateProcessor->setValue('pihak2_nama', $worker->name ?? '-');
        $templateProcessor->setValue('pihak2_tempat_lahir', $worker->birth_place ?? '-');
        $templateProcessor->setValue('pihak2_tgl_lahir', $worker->birth_date ? \Carbon\Carbon::parse($worker->birth_date)->translatedFormat('d F Y') : '-');
        $templateProcessor->setValue('pihak2_nik', $worker->ktp_number ?? '-');
        $templateProcessor->setValue('pihak2_jenis_kelamin', $worker->gender === 'male' ? 'Laki-Laki' : ($worker->gender === 'female' ? 'Perempuan' : '-'));
        $templateProcessor->setValue('pihak2_pendidikan', $worker->education ?? '-');
        $templateProcessor->setValue('pihak2_status_nikah', $worker->tax_status ? (strpos($worker->tax_status, 'TK') === 0 ? 'Belum Menikah' : (strpos($worker->tax_status, 'K') === 0 ? 'Menikah' : $worker->tax_status)) : '-');
        $templateProcessor->setValue('pihak2_alamat', $worker->address_domicile ?? $worker->address_ktp ?? '-');
        
        $templateProcessor->setValue('jabatan', $contract->assignment->position ?? '-');
        $templateProcessor->setValue('nama_client', strtoupper($contract->assignment->project->client->full_name ?? '-'));
        $templateProcessor->setValue('lokasi', $contract->assignment->branch->name ?? '-');
        $templateProcessor->setValue('upah_pokok', number_format($contract->compensation?->base_salary ?? 0, 0, ',', '.'));
        $templateProcessor->setValue('tunjangan', number_format(($contract->compensation?->meal_allowance ?? 0) + ($contract->compensation?->transport_allowance ?? 0), 0, ',', '.'));
        
        $pkwtNo = str_pad($contract->pkwt_number ?? 1, 3, '0', STR_PAD_LEFT);
        $clientPrefix = $contract->assignment->project->client->short_name ?? 'CLIENT';
        $romanMonths = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $month = \Carbon\Carbon::parse($contract->start_date ?? now())->month;
        $romanMonth = $romanMonths[$month] ?? 'I';
        $year = \Carbon\Carbon::parse($contract->start_date ?? now())->year;
        $pkwt_formatted = sprintf('%s/ARU-%s/PKWT/%s/%s', $pkwtNo, $clientPrefix, $romanMonth, $year);
        
        $templateProcessor->setValue('pkwt_number', $pkwt_formatted);
        
        $fileName = 'PKWT - ' . ($worker->name ?? 'Worker') . '.docx';
        $tempFile = tempnam(sys_get_temp_dir(), 'pkwt');
        $templateProcessor->saveAs($tempFile);
        
        return response()->download($tempFile, $fileName)->deleteFileAfterSend(true);
    }
}
