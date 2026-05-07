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
            'assignments' => function ($query) {
                $query->orderBy('hire_date', 'desc')
                      ->with([
                          'project',
                          'branches',
                          'contracts' => function ($q) {
                              $q->orderBy('start_date', 'desc')->with('compensation');
                          }
                      ]);
            },
            'familyMembers'
        ]);

        // If user is PIC, restrict to workers in their assigned projects
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $workersQuery->whereHas('assignments', function ($q) use ($projectIds) {
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
            'Kontrak Start Date', 'Kontrak End Date',
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
            $assignment = $worker->assignments->first();
            $contract = $assignment ? $assignment->contracts->first() : null;
            $comp = $contract ? $contract->compensation : null;
            $family = $worker->familyMembers;

            // Group family members by type
            $spouses = $family->where('relationship', 'Spouse')->values();
            $children = $family->where('relationship', 'Child')->values();

            $rowData = [
                // Identitas & Pekerjaan
                $worker->nik_aru ?? '',
                $worker->name ?? '',
                $assignment ? ($assignment->project->name ?? '') : '',
                $assignment ? $assignment->branches->pluck('name')->implode(', ') : '',
                $worker->hire_date ? $worker->hire_date->format('Y-m-d') : '',
                $contract->contract_type ?? 'Draft',
                $assignment ? ($assignment->status ?? 'Active') : 'Tanpa Penempatan',
                $assignment ? ($assignment->termination_date ? \Carbon\Carbon::parse($assignment->termination_date)->format('Y-m-d') : '') : '',
                $assignment->position ?? '',
                $worker->gender === 'male' ? 'Laki-laki' : ($worker->gender === 'female' ? 'Perempuan' : ''),
                $worker->birth_place ?? '',
                $worker->birth_date ? \Carbon\Carbon::parse($worker->birth_date)->format('Y-m-d') : '',
                $worker->address_ktp ?? '',
                $worker->address_domicile ?? '',
                $worker->phone ?? '',
                $worker->education ?? '',
                $worker->religion ?? '',
                $worker->tax_status ?? '', // Status PTKP

                // Kompensasi & Keuangan
                $comp ? $comp->base_salary : '',
                $comp ? $comp->meal_allowance : '',
                $comp ? $comp->transport_allowance : '',
                $comp ? $comp->overtime_weekday_rate : '',
                $comp ? $comp->overtime_holiday_rate : '',
                $worker->npwp ?? '',
                $worker->bank_name ?? '',
                $worker->bank_account_number ?? '',
                $worker->bpjs_kesehatan ?? '',
                $worker->bpjs_ketenagakerjaan ?? '',

                // Identitas Lanjutan
                $worker->ktp_number ?? '',
                $worker->kk_number ?? '',
                $worker->mother_name ?? '',

                // Kontrak (Start & End)
                $contract && $contract->start_date ? \Carbon\Carbon::parse($contract->start_date)->format('Y-m-d') : '',
                $contract && $contract->end_date ? \Carbon\Carbon::parse($contract->end_date)->format('Y-m-d') : '',

                // Keluarga Pasangan 1 & Anak 1-3
                $spouses[0]->name ?? '', $spouses[0]->birth_place ?? '', (isset($spouses[0]) && $spouses[0]->birth_date) ? \Carbon\Carbon::parse($spouses[0]->birth_date)->format('Y-m-d') : '', $spouses[0]->ktp_number ?? '', $spouses[0]->bpjs_kesehatan ?? '',
                $children[0]->name ?? '', $children[0]->birth_place ?? '', (isset($children[0]) && $children[0]->birth_date) ? \Carbon\Carbon::parse($children[0]->birth_date)->format('Y-m-d') : '', $children[0]->ktp_number ?? '', $children[0]->bpjs_kesehatan ?? '',
                $children[1]->name ?? '', $children[1]->birth_place ?? '', (isset($children[1]) && $children[1]->birth_date) ? \Carbon\Carbon::parse($children[1]->birth_date)->format('Y-m-d') : '', $children[1]->ktp_number ?? '', $children[1]->bpjs_kesehatan ?? '',
                $children[2]->name ?? '', $children[2]->birth_place ?? '', (isset($children[2]) && $children[2]->birth_date) ? \Carbon\Carbon::parse($children[2]->birth_date)->format('Y-m-d') : '', $children[2]->ktp_number ?? '', $children[2]->bpjs_kesehatan ?? '',

                // Keluarga Pasangan 2 & Anak 4-6
                $spouses[1]->name ?? '', $spouses[1]->birth_place ?? '', (isset($spouses[1]) && $spouses[1]->birth_date) ? \Carbon\Carbon::parse($spouses[1]->birth_date)->format('Y-m-d') : '', $spouses[1]->ktp_number ?? '', $spouses[1]->bpjs_kesehatan ?? '',
                $children[3]->name ?? '', $children[3]->birth_place ?? '', (isset($children[3]) && $children[3]->birth_date) ? \Carbon\Carbon::parse($children[3]->birth_date)->format('Y-m-d') : '', $children[3]->ktp_number ?? '', $children[3]->bpjs_kesehatan ?? '',
                $children[4]->name ?? '', $children[4]->birth_place ?? '', (isset($children[4]) && $children[4]->birth_date) ? \Carbon\Carbon::parse($children[4]->birth_date)->format('Y-m-d') : '', $children[4]->ktp_number ?? '', $children[4]->bpjs_kesehatan ?? '',
                $children[5]->name ?? '', $children[5]->birth_place ?? '', (isset($children[5]) && $children[5]->birth_date) ? \Carbon\Carbon::parse($children[5]->birth_date)->format('Y-m-d') : '', $children[5]->ktp_number ?? '', $children[5]->bpjs_kesehatan ?? '',
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
