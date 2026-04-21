<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\Storage;
use App\Services\ImportService;

/**
 * Class WorkerExportController
 *
 * Handles exporting all worker data to an XLSX file formatted exactly
 * like the Bulk Import template so it can be re-uploaded directly.
 */
class WorkerExportController extends Controller
{
    /**
     * Generate and stream the Worker XLSX export.
     *
     * @param Request $request
     * @return BinaryFileResponse
     */
    public function export(Request $request): BinaryFileResponse
    {
        $user = $request->user();

        // Query workers, including relationships loaded for export
        $workersQuery = Worker::with([
            'latestAssignment.project', 
            'latestAssignment.branch',
            'latestContract',
            'latestCompensation',
            'familyMembers'
        ]);

        // If user is PIC, restrict to workers in their assigned projects
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $workersQuery->whereHas('latestAssignment', function ($q) use ($projectIds) {
                $q->whereIn('project_id', $projectIds);
            });
        }

        $workers = $workersQuery->get();

        // Define Headers (MUST PERFECTLY MATCH ImportService::generateTemplate)
        $headers = [
            'NIK ARU', 'Nama Lengkap', 'Project', 'Cabang',
            'Tanggal Masuk', 'Jenis Kontrak', 'Status', 'Tanggal Keluar',
            'Jabatan', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir',
            'Alamat KTP', 'Alamat Domisili', 'No HP', 'Pendidikan',
            'Agama', 'Status PTKP', 'Gaji Pokok', 'Uang Makan',
            'Tunjangan Transport', 'Lembur Weekday', 'Lembur Libur',
            'NPWP', 'Bank', 'Rekening', 'BPJS Kesehatan',
            'BPJS Ketenagakerjaan', 'No KTP', 'No KK', 'Ibu Kandung',
            'PKWTT', 'PKWT 1 Start', 'PKWT 1 End', 'PKWT 2 Start', 'PKWT 2 End',
            'PKWT 3 Start', 'PKWT 3 End', 'PKWT 4 Start', 'PKWT 4 End',
            'PKWT 5 Start', 'PKWT 5 End', 'PKWT 6 Start', 'PKWT 6 End',
            'PKWT 7 Start', 'PKWT 7 End', 'PKWT 8 Start', 'PKWT 8 End',
            'Nama Istri/Suami (1)', 'Tempat Lahir Pasangan (1)',
            'Tanggal Lahir Pasangan (1)', 'NIK Pasangan (1)', 'BPJS Pasangan (1)',
            'Nama Anak 1 (1)', 'Tempat Lahir Anak 1 (1)',
            'Tanggal Lahir Anak 1 (1)', 'NIK Anak 1 (1)', 'BPJS Anak 1 (1)',
            'Nama Anak 2 (1)', 'Tempat Lahir Anak 2 (1)',
            'Tanggal Lahir Anak 2 (1)', 'NIK Anak 2 (1)', 'BPJS Anak 2 (1)',
            'Nama Anak 3 (1)', 'Tempat Lahir Anak 3 (1)',
            'Tanggal Lahir Anak 3 (1)', 'NIK Anak 3 (1)', 'BPJS Anak 3 (1)',
            'Nama Istri/Suami (2)', 'Tempat Lahir Pasangan (2)',
            'Tanggal Lahir Pasangan (2)', 'NIK Pasangan (2)', 'BPJS Pasangan (2)',
            'Nama Anak 1 (2)', 'Tempat Lahir Anak 1 (2)',
            'Tanggal Lahir Anak 1 (2)', 'NIK Anak 1 (2)', 'BPJS Anak 1 (2)',
            'Nama Anak 2 (2)', 'Tempat Lahir Anak 2 (2)',
            'Tanggal Lahir Anak 2 (2)', 'NIK Anak 2 (2)', 'BPJS Anak 2 (2)',
            'Nama Anak 3 (2)', 'Tempat Lahir Anak 3 (2)',
            'Tanggal Lahir Anak 3 (2)', 'NIK Anak 3 (2)', 'BPJS Anak 3 (2)',
        ];

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Write Headers and adjust width
        foreach ($headers as $index => $header) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue($colLetter . '1', $header);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        // Apply Header Styling
        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFEFEFEF'],
            ],
        ];
        $sheet->getStyle('A1:' . $lastCol . '1')->applyFromArray($headerStyle);
        $sheet->freezePane('A2');

        // Write Data Rows
        $rowNum = 2;
        foreach ($workers as $worker) {
            $assignment = $worker->latestAssignment;
            $contract = $worker->latestContract;
            $comp = $worker->latestCompensation;
            $family = $worker->familyMembers;

            // Group family members by type
            $spouses = $family->where('relationship', 'Spouse')->values();
            $children = $family->where('relationship', 'Child')->values();

            $rowData = [
                // Identitas & Pekerjaan
                $worker->nik_aru ?? '',
                $worker->name ?? '',
                $assignment ? ($assignment->project->name ?? '') : '',
                $assignment ? ($assignment->branch->name ?? '') : '',
                $worker->hire_date ? $worker->hire_date->format('Y-m-d') : '',
                $contract->type ?? 'Draft',
                $worker->status ?? 'Aktif',
                $worker->resign_date ? $worker->resign_date->format('Y-m-d') : '',
                $assignment->position ?? '',
                $worker->gender === 'M' ? 'Pria' : ($worker->gender === 'F' ? 'Wanita' : ''),
                $worker->birth_place ?? '',
                $worker->birth_date ? $worker->birth_date->format('Y-m-d') : '',
                $worker->address_ktp ?? '',
                $worker->address_domicile ?? '',
                $worker->phone ?? '',
                $worker->education ?? '',
                $worker->religion ?? '',
                $comp->ptkp_status ?? '',

                // Kompensasi & Keuangan
                $comp->base_salary ?? '',
                $comp->meal_allowance ?? '',
                $comp->transport_allowance ?? '',
                $comp->overtime_weekday ?? '',
                $comp->overtime_holiday ?? '',
                $comp->npwp_number ?? '',
                $comp->bank_name ?? '',
                $comp->bank_account ?? '',
                $comp->bpjs_kesehatan ?? '',
                $comp->bpjs_ketenagakerjaan ?? '',

                // Identitas Lanjutan
                $worker->ktp_number ?? '',
                $worker->kk_number ?? '',
                $worker->mother_name ?? '',

                // Kontrak (PKWTT & PKWT 1-8)
                $contract->type === 'PKWTT' && $contract->start_date ? $contract->start_date->format('Y-m-d') : '',
                $contract->type === 'PKWT 1' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 1' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 2' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 2' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 3' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 3' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 4' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 4' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 5' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 5' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 6' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 6' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 7' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 7' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 8' ? ($contract->start_date ? $contract->start_date->format('Y-m-d') : '') : '',
                $contract->type === 'PKWT 8' ? ($contract->end_date ? $contract->end_date->format('Y-m-d') : '') : '',

                // Keluarga Pasangan 1 & Anak 1-3
                $spouses[0]->name ?? '', $spouses[0]->birth_place ?? '', $spouses[0]->birth_date ? $spouses[0]->birth_date->format('Y-m-d') : '', $spouses[0]->ktp_number ?? '', $spouses[0]->bpjs_kesehatan ?? '',
                $children[0]->name ?? '', $children[0]->birth_place ?? '', $children[0]->birth_date ? $children[0]->birth_date->format('Y-m-d') : '', $children[0]->ktp_number ?? '', $children[0]->bpjs_kesehatan ?? '',
                $children[1]->name ?? '', $children[1]->birth_place ?? '', $children[1]->birth_date ? $children[1]->birth_date->format('Y-m-d') : '', $children[1]->ktp_number ?? '', $children[1]->bpjs_kesehatan ?? '',
                $children[2]->name ?? '', $children[2]->birth_place ?? '', $children[2]->birth_date ? $children[2]->birth_date->format('Y-m-d') : '', $children[2]->ktp_number ?? '', $children[2]->bpjs_kesehatan ?? '',

                // Keluarga Pasangan 2 & Anak 4-6
                $spouses[1]->name ?? '', $spouses[1]->birth_place ?? '', $spouses[1]->birth_date ? $spouses[1]->birth_date->format('Y-m-d') : '', $spouses[1]->ktp_number ?? '', $spouses[1]->bpjs_kesehatan ?? '',
                $children[3]->name ?? '', $children[3]->birth_place ?? '', $children[3]->birth_date ? $children[3]->birth_date->format('Y-m-d') : '', $children[3]->ktp_number ?? '', $children[3]->bpjs_kesehatan ?? '',
                $children[4]->name ?? '', $children[4]->birth_place ?? '', $children[4]->birth_date ? $children[4]->birth_date->format('Y-m-d') : '', $children[4]->ktp_number ?? '', $children[4]->bpjs_kesehatan ?? '',
                $children[5]->name ?? '', $children[5]->birth_place ?? '', $children[5]->birth_date ? $children[5]->birth_date->format('Y-m-d') : '', $children[5]->ktp_number ?? '', $children[5]->bpjs_kesehatan ?? '',
            ];

            foreach ($rowData as $colIndex => $value) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1);
                $sheet->setCellValueExplicit($colLetter . $rowNum, $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            }
            $rowNum++;
        }

        $filename = 'Export_Karyawan_' . date('Y-m-d_His') . '.xlsx';
        $fullPath = storage_path('app/temp/' . $filename);
        
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($fullPath);

        return response()->download($fullPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
