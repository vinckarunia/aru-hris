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
        $user = $request->user();

        $contract->load(['compensation', 'assignment.worker', 'assignment.project.client', 'assignment.branches']);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Kontrak ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Mengunduh kontrak hanya diperbolehkan untuk Admin dan PIC project terkait.');
        }
        
        $user = $request->user();
        
        // Pihak Pertama: Use the logged-in ARU user's linked InternalEmployee profile.
        // Falls back to name search, then position search, then any first employee.
        $pihakPertama = ($user->internalEmployee ?? null)
            ?? InternalEmployee::where('name', 'JUMAGA TUA SINAGA')->first()
            ?? InternalEmployee::where('position', 'Head of Operation')->first();
            
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
        
        if (strtolower($contract->contract_type) === 'harian' && $pkwtType === 'tlj') {
            $viewName = 'pdf.dw_tlj';
        } elseif (strtolower($contract->contract_type) === 'part-time' && $pkwtType === 'tlj') {
            $viewName = 'pdf.pt_tlj';
        } else {
            $viewName = match ($pkwtType) {
                'cj'  => 'pdf.pkwt_cj',
                'tlj' => 'pdf.pkwt_tlj',
                'all' => 'pdf.pkwt_all',
                default => 'pdf.pkwt', // vdi
            };
        }
        
        // Audit log for PKWT download
        $workerName = $contract->assignment->worker->name ?? 'Unknown';
        \App\Models\AuditLog::log('download', 'contract', "Mengunduh PKWT untuk karyawan: {$workerName}", [
            'contract_id' => $contract->id,
            'document_type' => 'PKWT',
            'worker_name' => $workerName,
        ]);

        return $this->generatePkwtPdf($data, $viewName);
    }

    /**
     * Download the Surat Tugas document (PDF).
     */
    public function downloadSuratTugas(Request $request, Contract $contract)
    {
        $user = $request->user();

        $contract->load(['compensation', 'assignment.worker', 'assignment.project.client', 'assignment.branches']);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Surat tugas ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Mengunduh surat tugas hanya diperbolehkan untuk Admin dan PIC project terkait.');
        }
        
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
                  ->setOptions([
                      'isPhpEnabled' => true,
                      'isRemoteEnabled' => true,
                      'isFontSubsettingEnabled' => true,
                      'chroot' => public_path()
                  ]);
        $fileName = 'Surat Tugas - ' . ($data['worker']->name ?? 'Worker') . '.pdf';

        // Audit log for Surat Tugas download
        $workerName = $contract->assignment->worker->name ?? 'Unknown';
        \App\Models\AuditLog::log('download', 'contract', "Mengunduh Surat Tugas untuk karyawan: {$workerName}", [
            'contract_id' => $contract->id,
            'document_type' => 'Surat Tugas',
            'worker_name' => $workerName,
        ]);

        return $pdf->download($fileName);
    }

    /**
     * Download the Paklaring (Surat Keterangan Kerja) document.
     */
    public function downloadPaklaring(Request $request, \App\Models\Assignment $assignment)
    {
        $user = $request->user();

        $assignment->load(['worker', 'project.client', 'branches']);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Penempatan ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Mengunduh paklaring hanya diperbolehkan untuk Admin dan PIC project terkait.');
        }
        
        // 1. Validation for equipment_returned
        if (!$assignment->equipment_returned) {
            abort(403, 'Gagal mengunduh: Perangkat kerja belum dikembalikan.');
        }

        // 2. Validation for Grade A / Grade B
        $grade = '';
        if ($assignment->status === 'contract expired') {
            $grade = 'A';
        } elseif ($assignment->status === 'resign') {
            $grade = 'B';
        } else {
            abort(403, 'Gagal mengunduh: Status penempatan harus Resign atau Contract Expired untuk mencetak Paklaring.');
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

        $data = [
            'assignment'    => $assignment,
            'worker'        => $assignment->worker,
            'pihakPertama'  => $pihakPertama,
            'logoPath'      => $this->getAssetPath('logo'),
            'signaturePath' => $this->getAssetPath('signature'),
            'grade'         => $grade,
            'nomorSurat'    => $nomorSurat,
        ];
        
        $pdf = Pdf::loadView('pdf.paklaring', $data)
                  ->setPaper('a4', 'portrait')
                  ->setOptions([
                      'isPhpEnabled' => true,
                      'isRemoteEnabled' => true,
                      'isFontSubsettingEnabled' => true,
                      'chroot' => public_path()
                  ]);
        $fileName = 'Paklaring - ' . ($data['worker']->name ?? 'Worker') . '.pdf';

        \App\Models\AuditLog::log('download', 'assignment', "Mengunduh Paklaring (Grade {$grade}) untuk karyawan: {$data['worker']->name}", [
            'assignment_id' => $assignment->id,
            'document_type' => 'Paklaring',
            'grade'         => $grade,
        ]);

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

        $prefix = (isset($data['contract']) && in_array(strtolower($data['contract']->contract_type), ['harian', 'part-time'])) ? 'PKPH' : 'PKWT';
        $fileName = $prefix . ' - ' . ($data['worker']->name ?? 'Worker') . '.pdf';
        
        return $pdf->download($fileName);
    }
}
