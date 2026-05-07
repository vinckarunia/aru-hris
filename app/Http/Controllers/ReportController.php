<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Class ReportController
 *
 * Handles the Query Builder feature for generating and exporting
 * customized HRIS reports in CSV or XLSX format.
 */
class ReportController extends Controller
{
    /**
     * Column definitions organized by category.
     * Maps frontend keys to database column expressions, labels, and join requirements.
     *
     * @var array<string, array<string, array{column: string, label: string, joins: string[]}>>
     */
    private const COLUMN_DEFINITIONS = [
        'worker' => [
            'worker_nik_aru'              => ['column' => 'workers.nik_aru',              'label' => 'NIK ARU',                 'joins' => []],
            'worker_name'                 => ['column' => 'workers.name',                 'label' => 'Nama Karyawan',           'joins' => []],
            'worker_ktp_number'           => ['column' => 'workers.ktp_number',           'label' => 'No. KTP',                 'joins' => []],
            'worker_kk_number'            => ['column' => 'workers.kk_number',            'label' => 'No. KK',                  'joins' => []],
            'worker_birth_place'          => ['column' => 'workers.birth_place',          'label' => 'Tempat Lahir',            'joins' => []],
            'worker_birth_date'           => ['column' => 'workers.birth_date',           'label' => 'Tanggal Lahir',           'joins' => []],
            'worker_gender'               => ['column' => 'workers.gender',               'label' => 'Jenis Kelamin',           'joins' => []],
            'worker_phone'                => ['column' => 'workers.phone',                'label' => 'Telepon',                 'joins' => []],
            'worker_education'            => ['column' => 'workers.education',            'label' => 'Pendidikan',              'joins' => []],
            'worker_religion'             => ['column' => 'workers.religion',             'label' => 'Agama',                   'joins' => []],
            'worker_tax_status'           => ['column' => 'workers.tax_status',           'label' => 'Status Pajak',            'joins' => []],
            'worker_address_ktp'          => ['column' => 'workers.address_ktp',          'label' => 'Alamat KTP',              'joins' => []],
            'worker_address_domicile'     => ['column' => 'workers.address_domicile',     'label' => 'Alamat Domisili',         'joins' => []],
            'worker_mother_name'          => ['column' => 'workers.mother_name',          'label' => 'Nama Ibu',               'joins' => []],
            'worker_npwp'                 => ['column' => 'workers.npwp',                 'label' => 'NPWP',                    'joins' => []],
            'worker_bpjs_kesehatan'       => ['column' => 'workers.bpjs_kesehatan',       'label' => 'BPJS Kesehatan',          'joins' => []],
            'worker_bpjs_ketenagakerjaan' => ['column' => 'workers.bpjs_ketenagakerjaan', 'label' => 'BPJS Ketenagakerjaan',    'joins' => []],
            'worker_bank_name'            => ['column' => 'workers.bank_name',            'label' => 'Bank',                    'joins' => []],
            'worker_bank_account_number'  => ['column' => 'workers.bank_account_number',  'label' => 'No. Rekening',            'joins' => []],
        ],
        'assignment' => [
            'assignment_employee_id'      => ['column' => 'assignments.employee_id',      'label' => 'Employee ID',             'joins' => ['assignments']],
            'assignment_position'         => ['column' => 'assignments.position',         'label' => 'Posisi',                  'joins' => ['assignments']],
            'assignment_hire_date'        => ['column' => 'assignments.hire_date',        'label' => 'Tanggal Masuk',           'joins' => ['assignments']],
            'assignment_termination_date' => ['column' => 'assignments.termination_date', 'label' => 'Tanggal Keluar',          'joins' => ['assignments']],
            'assignment_status'           => ['column' => 'assignments.status',           'label' => 'Status Penempatan',       'joins' => ['assignments']],
            'assignment_project'          => ['column' => 'projects.name',                'label' => 'Project',                 'joins' => ['assignments', 'projects']],
            'assignment_client'           => ['column' => 'clients.full_name',            'label' => 'Client',                  'joins' => ['assignments', 'projects', 'clients']],
            'assignment_branch'           => ['column' => 'branches.name',                'label' => 'Cabang',                  'joins' => ['assignments', 'branches']],
        ],
        'contract' => [
            'contract_type'               => ['column' => 'contracts.contract_type',      'label' => 'Tipe Kontrak',            'joins' => ['assignments', 'contracts']],
            'contract_pkwt_type'          => ['column' => 'contracts.pkwt_type',          'label' => 'Tipe PKWT',               'joins' => ['assignments', 'contracts']],
            'contract_pkwt_number'        => ['column' => 'contracts.pkwt_number',        'label' => 'No. PKWT',                'joins' => ['assignments', 'contracts']],
            'contract_start_date'         => ['column' => 'contracts.start_date',         'label' => 'Kontrak Mulai',           'joins' => ['assignments', 'contracts']],
            'contract_end_date'           => ['column' => 'contracts.end_date',           'label' => 'Kontrak Berakhir',        'joins' => ['assignments', 'contracts']],
            'contract_duration_months'    => ['column' => 'contracts.duration_months',    'label' => 'Durasi (Bulan)',           'joins' => ['assignments', 'contracts']],
            'contract_evaluation_notes'   => ['column' => 'contracts.evaluation_notes',   'label' => 'Catatan Evaluasi',        'joins' => ['assignments', 'contracts']],
        ],
        'compensation' => [
            'comp_base_salary'            => ['column' => 'contract_compensation.base_salary',            'label' => 'Gaji Pokok',          'joins' => ['assignments', 'contracts', 'compensations']],
            'comp_salary_rate'            => ['column' => 'contract_compensation.salary_rate',            'label' => 'Rate Gaji',           'joins' => ['assignments', 'contracts', 'compensations']],
            'comp_meal_allowance'         => ['column' => 'contract_compensation.meal_allowance',         'label' => 'Tunj. Makan',         'joins' => ['assignments', 'contracts', 'compensations']],
            'comp_transport_allowance'    => ['column' => 'contract_compensation.transport_allowance',    'label' => 'Tunj. Transport',     'joins' => ['assignments', 'contracts', 'compensations']],
            'comp_allowance_rate'         => ['column' => 'contract_compensation.allowance_rate',         'label' => 'Rate Tunjangan',      'joins' => ['assignments', 'contracts', 'compensations']],
            'comp_overtime_weekday'       => ['column' => 'contract_compensation.overtime_weekday_rate',  'label' => 'Lembur Weekday',      'joins' => ['assignments', 'contracts', 'compensations']],
            'comp_overtime_holiday'       => ['column' => 'contract_compensation.overtime_holiday_rate',  'label' => 'Lembur Holiday',      'joins' => ['assignments', 'contracts', 'compensations']],
            'comp_overtime_rate'          => ['column' => 'contract_compensation.overtime_rate',          'label' => 'Rate Lembur',         'joins' => ['assignments', 'contracts', 'compensations']],
        ],
    ];

    /**
     * Display the Query Builder page.
     *
     * @return Response
     */
    public function index(): Response
    {
        $clients = Client::select('id', 'full_name')
            ->orderBy('full_name')
            ->with('projects:id,client_id,name')
            ->get();

        // Build column options for the frontend
        $columnOptions = [];
        foreach (self::COLUMN_DEFINITIONS as $category => $columns) {
            $items = [];
            foreach ($columns as $key => $def) {
                $items[] = ['key' => $key, 'label' => $def['label']];
            }
            $columnOptions[$category] = $items;
        }

        return Inertia::render('Report/Index', [
            'clients'       => $clients,
            'columnOptions'  => $columnOptions,
        ]);
    }

    /**
     * Preview the query results (limited to 50 rows).
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function preview(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('RAW PAYLOAD:', $request->all());
        try {
            $validated = $request->validate([
                'columns'              => 'required|array|min:1',
                'columns.*'            => 'string',
                'filters.client_id'    => 'nullable|integer',
                'filters.project_id'   => 'nullable|integer',
                'filters.status'       => 'nullable|string',
                'filters.hire_date_from' => 'nullable|date',
                'filters.hire_date_to'   => 'nullable|date',
                'filters.only_latest'  => 'nullable|boolean',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('Validation failed in preview: ', $e->errors());
            throw $e;
        }

        $columns = $validated['columns'];
        $filters = $validated['filters'] ?? [];

        $query = $this->buildQuery($columns, $filters);
        $results = $query->limit(50)->get();
        $results = $this->formatResults($results, $columns);

        // Build header labels
        $headers = $this->getHeaderLabels($columns);

        return response()->json([
            'headers' => $headers,
            'rows'    => $results->map(fn ($row) => array_values((array) $row))->toArray(),
        ]);
    }

    /**
     * Export data as CSV or XLSX file.
     *
     * @param Request $request
     * @return StreamedResponse|\Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function export(Request $request)
    {
        $validated = $request->validate([
            'columns'              => 'required|array|min:1',
            'columns.*'            => 'string',
            'format'               => 'required|in:csv,xlsx',
            'filters.client_id'    => 'nullable|integer',
            'filters.project_id'   => 'nullable|integer',
            'filters.status'       => 'nullable|string',
            'filters.hire_date_from' => 'nullable|date',
            'filters.hire_date_to'   => 'nullable|date',
            'filters.only_latest'  => 'nullable|boolean',
        ]);

        $columns = $validated['columns'];
        $filters = $validated['filters'] ?? [];
        $format  = $validated['format'];

        $query = $this->buildQuery($columns, $filters);
        $results = $query->get();
        $results = $this->formatResults($results, $columns);
        
        $headers = $this->getHeaderLabels($columns);
        $generatedAt = now()->timezone('Asia/Jakarta')->format('d/m/Y H:i') . ' WIB';

        if ($format === 'csv') {
            return $this->exportCsv($headers, $results, $generatedAt);
        }

        return $this->exportXlsx($headers, $results, $generatedAt);
    }

    /**
     * Build the Eloquent query based on selected columns and filters.
     *
     * @param array<string> $columns Selected column keys.
     * @param array<string, mixed> $filters Active filters.
     * @return \Illuminate\Database\Query\Builder
     */
    private function buildQuery(array $columns, array $filters)
    {
        // Gather all column definitions and required joins
        $allDefs = array_merge(...array_values(self::COLUMN_DEFINITIONS));
        $selectColumns = [];
        $requiredJoins = [];

        foreach ($columns as $key) {
            if (!isset($allDefs[$key])) {
                continue;
            }
            $def = $allDefs[$key];
            $selectColumns[] = DB::raw("{$def['column']} as `{$key}`");
            foreach ($def['joins'] as $join) {
                $requiredJoins[$join] = true;
            }
        }

        // Also add joins required by active filters
        if (!empty($filters['client_id']) || !empty($filters['project_id']) || !empty($filters['status'])
            || !empty($filters['hire_date_from']) || !empty($filters['hire_date_to'])) {
            $requiredJoins['assignments'] = true;
        }
        if (!empty($filters['client_id'])) {
            $requiredJoins['projects'] = true;
        }

        $query = DB::table('workers');

        $onlyLatest = !empty($filters['only_latest']) && filter_var($filters['only_latest'], FILTER_VALIDATE_BOOLEAN);

        // Apply joins in dependency order
        if (isset($requiredJoins['assignments'])) {
            $query->leftJoin('assignments', function ($join) use ($onlyLatest) {
                $join->on('workers.id', '=', 'assignments.worker_id');
                if ($onlyLatest) {
                    $join->whereRaw('assignments.id = (SELECT MAX(id) FROM assignments a2 WHERE a2.worker_id = workers.id)');
                }
            });
        }
        if (isset($requiredJoins['projects'])) {
            $query->leftJoin('projects', 'assignments.project_id', '=', 'projects.id');
        }
        if (isset($requiredJoins['clients'])) {
            $query->leftJoin('clients', 'projects.client_id', '=', 'clients.id');
        }
        if (isset($requiredJoins['branches'])) {
            $query->leftJoin('assignment_branch', 'assignments.id', '=', 'assignment_branch.assignment_id')
                  ->leftJoin('branches', 'assignment_branch.branch_id', '=', 'branches.id');
        }
        if (isset($requiredJoins['contracts'])) {
            $query->leftJoin('contracts', function ($join) use ($onlyLatest) {
                $join->on('assignments.id', '=', 'contracts.assignment_id');
                if ($onlyLatest) {
                    $join->whereRaw('contracts.id = (SELECT MAX(id) FROM contracts c2 WHERE c2.assignment_id = assignments.id)');
                }
            });
        }
        if (isset($requiredJoins['compensations'])) {
            $query->leftJoin('contract_compensation', 'contracts.id', '=', 'contract_compensation.contract_id');
        }

        $query->select($selectColumns);

        // Apply filters
        if (!empty($filters['client_id'])) {
            $query->where('projects.client_id', $filters['client_id']);
        }
        if (!empty($filters['project_id'])) {
            $query->where('assignments.project_id', $filters['project_id']);
        }
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'non_active') {
                $query->whereIn('assignments.status', ['resign', 'contract expired', 'end_contract', 'project closed', 'fired', 'other']);
            } else {
                $query->where('assignments.status', $filters['status']);
            }
        }
        if (!empty($filters['hire_date_from'])) {
            $query->where('assignments.hire_date', '>=', $filters['hire_date_from']);
        }
        if (!empty($filters['hire_date_to'])) {
            $query->where('assignments.hire_date', '<=', $filters['hire_date_to']);
        }

        $query->orderBy('workers.name', 'asc');

        return $query;
    }

    /**
     * Get human-readable header labels for the selected column keys.
     *
     * @param array<string> $columns Selected column keys.
     * @return array<string>
     */
    private function getHeaderLabels(array $columns): array
    {
        $allDefs = array_merge(...array_values(self::COLUMN_DEFINITIONS));
        $headers = [];
        foreach ($columns as $key) {
            $headers[] = $allDefs[$key]['label'] ?? $key;
        }
        return $headers;
    }

    /**
     * Format the raw results to use human-readable alias values for enums.
     *
     * @param \Illuminate\Support\Collection $results
     * @param array<string> $columns
     * @return \Illuminate\Support\Collection
     */
    private function formatResults($results, array $columns)
    {
        $aliases = [
            // Gender
            'male'   => 'Laki-laki',
            'female' => 'Perempuan',
            
            // Religion
            'islam'    => 'Islam',
            'kristen'  => 'Kristen',
            'katolik'  => 'Katolik',
            'hindu'    => 'Hindu',
            'buddha'   => 'Buddha',
            'konghucu' => 'Konghucu',
            'other'    => 'Lainnya',

            // Assignment Status
            'active'           => 'Aktif',
            'contract expired' => 'Contract Expired',
            'project closed'   => 'Project Closed',
            'resign'           => 'Resign',
            'fired'            => 'Diberhentikan',

            // Rates
            'hourly'  => 'Per Jam',
            'daily'   => 'Harian',
            'monthly' => 'Bulanan',
            'yearly'  => 'Tahunan',

            // Contract Type
            'pkwt'    => 'PKWT',
            'pkwtt'   => 'PKWTT',
            'mitra'   => 'Mitra',
            'intern'  => 'Internship',
            'probation' => 'Probation',
        ];

        // Specific columns that should be translated
        $translatableColumns = [
            'worker_gender',
            'worker_religion',
            'assignment_status',
            'contract_type',
            'comp_salary_rate',
            'comp_allowance_rate',
            'comp_overtime_rate',
        ];

        return $results->map(function ($row) use ($columns, $aliases, $translatableColumns) {
            foreach ($columns as $col) {
                if (in_array($col, $translatableColumns) && isset($row->$col)) {
                    $originalValue = strtolower($row->$col);
                    if (isset($aliases[$originalValue])) {
                        $row->$col = $aliases[$originalValue];
                    }
                }
            }
            return $row;
        });
    }

    /**
     * Generate and stream a CSV file response.
     *
     * @param array<string> $headers Column header labels.
     * @param \Illuminate\Support\Collection $results Query results.
     * @param string $generatedAt Formatted generation timestamp.
     * @return StreamedResponse
     */
    private function exportCsv(array $headers, $results, string $generatedAt): StreamedResponse
    {
        $filename = 'laporan_hris_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($headers, $results, $generatedAt) {
            $handle = fopen('php://output', 'w');

            // BOM for UTF-8 compatibility in Excel
            fwrite($handle, "\xEF\xBB\xBF");

            // Report generation date header
            fputcsv($handle, ['Laporan dibuat pada: ' . $generatedAt]);
            fputcsv($handle, []);

            // Column headers
            fputcsv($handle, $headers);

            // Data rows
            foreach ($results as $row) {
                $formattedColumns = array_map(function ($val) {
                    // Force Excel to interpret value strictly as text for CSV
                    // Doing ="Value" prevents Excel from dropping leading zeros or using Scientific notation
                    if ($val === null) return '';
                    return '="' . str_replace('"', '""', $val) . '"';
                }, array_values((array) $row));

                fputcsv($handle, $formattedColumns);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Generate and return an XLSX file response.
     *
     * @param array<string> $headers Column header labels.
     * @param \Illuminate\Support\Collection $results Query results.
     * @param string $generatedAt Formatted generation timestamp.
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    private function exportXlsx(array $headers, $results, string $generatedAt)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Laporan');

        // Row 1: Generation timestamp
        $sheet->setCellValue('A1', 'Laporan dibuat pada: ' . $generatedAt);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(11);

        // Row 3: Column headers
        $headerRow = 3;
        foreach ($headers as $colIndex => $header) {
            $cellCoord = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1) . $headerRow;
            $sheet->setCellValue($cellCoord, $header);
            $sheet->getStyle($cellCoord)->getFont()->setBold(true);
        }

        // Data rows starting from row 4
        $dataRowStart = 4;
        foreach ($results as $rowIndex => $row) {
            $values = array_values((array) $row);
            foreach ($values as $colIndex => $value) {
                $cellCoord = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1) . ($dataRowStart + $rowIndex);
                if ($value !== null) {
                    $sheet->setCellValueExplicit($cellCoord, $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                } else {
                    $sheet->setCellValue($cellCoord, '');
                }
            }
        }

        // Auto-size columns
        foreach (range(0, count($headers) - 1) as $colIndex) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        $filename = 'laporan_hris_' . now()->format('Ymd_His') . '.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'report_') . '.xlsx';

        $writer = new Xlsx($spreadsheet);
        $writer->save($tempFile);

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
