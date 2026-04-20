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
        if (!$request->user()->isAdminOrAbove()) abort(403, 'Akses ditolak. Mengunduh kontrak hanya diperbolehkan untuk Admin.');

        $contract->load(['compensation', 'assignment.worker', 'assignment.project.client', 'assignment.branch']);
        
        $user = $request->user();
        
        // Pihak Pertama: Use the logged-in ARU user's linked InternalEmployee profile.
        // Falls back to name search, then position search, then any first employee.
        $pihakPertama = ($user->internalEmployee ?? null)
            ?? InternalEmployee::where('name', 'JUMAGA TUA SINAGA')->first()
            ?? InternalEmployee::where('position', 'Head of Operation')->first()
            ?? InternalEmployee::first();
            
        $format = $request->query('format', 'pdf');

        // Monthly letter sequence: count contracts starting in the same month+year.
        $contractMonth = $contract->start_date
            ? \Carbon\Carbon::parse($contract->start_date)
            : now();
        $pkwtMonthlySeq = \App\Models\Contract::whereYear('start_date', $contractMonth->year)
            ->whereMonth('start_date', $contractMonth->month)
            ->where('id', '<=', $contract->id)
            ->count();
        
        $data = [
            'contract'        => $contract,
            'worker'          => $contract->assignment->worker,
            'pihakPertama'    => $pihakPertama,
            'logoPath'        => $this->getAssetPath('logo'),
            'signaturePath'   => $this->getAssetPath('signature'),
            'pkwtMonthlySeq'  => $pkwtMonthlySeq,
        ];
        
        // Map project's pkwt_type to the appropriate blade view
        $pkwtType = $contract->assignment->project->pkwt_type ?? 'vdi';
        $viewName = match ($pkwtType) {
            'cj'  => 'pdf.pkwt_cj',
            'all' => 'pdf.pkwt_all',
            default => 'pdf.pkwt', // vdi
        };
        
        return $this->generatePkwtPdf($data, $viewName);
    }

    /**
     * Download the Surat Tugas document (PDF).
     */
    public function downloadSuratTugas(Request $request, Contract $contract)
    {
        if (!$request->user()->isAdminOrAbove()) abort(403, 'Akses ditolak. Mengunduh kontrak hanya diperbolehkan untuk Admin.');

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
        
        $pdf = Pdf::loadView('pdf.surat-tugas', $data)
                  ->setPaper('a4', 'portrait')
                  ->setOptions(['isPhpEnabled' => true]);
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
        $path = public_path('uploads/' . $setting);
        return file_exists($path) ? $path : null;
    }

    /**
     * Generate PKWT as PDF
     */
    private function generatePkwtPdf(array $data, string $viewName)
    {
        $pdf = Pdf::loadView($viewName, $data)
                  ->setPaper('a4', 'portrait')
                  ->setOptions([
                      'isPhpEnabled' => true,
                      'isRemoteEnabled' => true,
                      'isFontSubsettingEnabled' => true,
                      'chroot' => public_path()
                  ]);

        $fileName = 'PKWT - ' . ($data['worker']->name ?? 'Worker') . '.pdf';
        
        return $pdf->download($fileName);
    }
}
