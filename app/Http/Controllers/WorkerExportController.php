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
     * Supports query-string filters passed from the frontend:
     *   - search: Filters by name or NIK ARU (partial match).
     *   - status: Filters by assignment status ('active', 'non_active', 'resign', etc.).
     *   - client_id: Filters workers whose assignment project belongs to this client.
     *   - project_id: Filters workers whose assignment matches this project.
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
        ]);

        // If user is PIC, restrict to workers in their assigned projects
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $workersQuery->whereHas('assignments', function ($q) use ($projectIds) {
                $q->whereIn('project_id', $projectIds);
            });
        }

        // ── Apply filters from query string ──────────────────────────
        $search    = $request->query('search');
        $status    = $request->query('status');
        $clientId  = $request->query('client_id');
        $projectId = $request->query('project_id');

        if ($search) {
            $workersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nik_aru', 'like', "%{$search}%");
            });
        }

        if ($projectId) {
            $workersQuery->whereHas('assignments', function ($q) use ($projectId) {
                $q->where('project_id', $projectId);
            });
        } elseif ($clientId) {
            $workersQuery->whereHas('assignments.project', function ($q) use ($clientId) {
                $q->where('client_id', $clientId);
            });
        }

        if ($status && $status !== 'all') {
            $nonActiveStatuses = ['resign', 'contract expired', 'end_contract', 'project closed', 'fired', 'other'];

            if ($status === 'non_active') {
                $workersQuery->whereHas('assignments', function ($q) use ($nonActiveStatuses) {
                    $q->whereIn('status', $nonActiveStatuses);
                });
            } elseif ($status === 'none') {
                $workersQuery->doesntHave('assignments');
            } else {
                $workersQuery->whereHas('assignments', function ($q) use ($status) {
                    $q->where('status', $status);
                });
            }
        }

        $workers = $workersQuery->get();

        // Define Headers (family columns removed)
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
                $worker->gender === 'male' ? 'Pria' : ($worker->gender === 'female' ? 'Wanita' : ''),
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
