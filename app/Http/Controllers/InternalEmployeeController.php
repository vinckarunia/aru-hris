<?php

namespace App\Http\Controllers;

use App\Models\InternalEmployee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Class InternalEmployeeController
 *
 * Handles CRUD operations for internal employees of PT. ARU.
 * Access restricted to SUPER_ADMIN and ADMIN_ARU roles.
 */
class InternalEmployeeController extends Controller
{
    /**
     * Display a listing of internal employees.
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $employees = InternalEmployee::latest()->get();

        return Inertia::render('InternalEmployee/Index', [
            'employees' => $employees,
        ]);
    }

    /**
     * Show the form for creating a new internal employee.
     *
     * @return Response
     */
    public function create(): Response
    {
        return Inertia::render('InternalEmployee/Create');
    }

    /**
     * Store a newly created internal employee in storage.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->getValidationRules(), $this->getValidationMessages());

        $employee = InternalEmployee::create($validated);

        \App\Models\AuditLog::log('create', 'internal_employee', "Menambahkan karyawan internal: {$employee->name}", ['internal_employee_id' => $employee->id]);

        return redirect()->route('internal-employees.index')
            ->with('message', 'Karyawan internal berhasil ditambahkan.');
    }

    /**
     * Display the specified internal employee.
     *
     * @param InternalEmployee $internalEmployee
     * @return Response
     */
    public function show(InternalEmployee $internalEmployee): Response
    {
        return Inertia::render('InternalEmployee/Show', [
            'employee' => $internalEmployee,
        ]);
    }

    /**
     * Show the form for editing the specified internal employee.
     *
     * @param InternalEmployee $internalEmployee
     * @return Response
     */
    public function edit(InternalEmployee $internalEmployee): Response
    {
        return Inertia::render('InternalEmployee/Edit', [
            'employee' => $internalEmployee,
        ]);
    }

    /**
     * Update the specified internal employee in storage.
     *
     * @param Request $request
     * @param InternalEmployee $internalEmployee
     * @return RedirectResponse
     */
    public function update(Request $request, InternalEmployee $internalEmployee): RedirectResponse
    {
        $validated = $request->validate(
            $this->getValidationRules($internalEmployee->id),
            $this->getValidationMessages()
        );

        $internalEmployee->update($validated);

        \App\Models\AuditLog::log('update', 'internal_employee', "Memperbarui karyawan internal: {$internalEmployee->name}", ['internal_employee_id' => $internalEmployee->id, 'changes' => $internalEmployee->getChanges()]);

        return redirect()->route('internal-employees.show', $internalEmployee)
            ->with('message', 'Data karyawan internal berhasil diperbarui.');
    }

    /**
     * Remove the specified internal employee from storage.
     *
     * @param InternalEmployee $internalEmployee
     * @return RedirectResponse
     */
    public function destroy(InternalEmployee $internalEmployee): RedirectResponse
    {
        \App\Models\AuditLog::log('delete', 'internal_employee', "Menghapus karyawan internal: {$internalEmployee->name}", ['internal_employee_id' => $internalEmployee->id]);
        $internalEmployee->delete();

        return redirect()->route('internal-employees.index')
            ->with('message', 'Karyawan internal berhasil dihapus.');
    }

    /**
     * Define validation rules for internal employee data.
     * Digit lengths are loaded dynamically from system settings.
     *
     * @param int|null $employeeId Optional employee ID to ignore for unique checks during updates.
     * @return array
     */
    private function getValidationRules(?int $employeeId = null): array
    {
        $digits = \App\Http\Controllers\SettingController::getValidationDigits();

        return [
            'nik_aru' => ['nullable', 'string', 'max:50', Rule::unique('internal_employees')->ignore($employeeId)],
            'name' => 'required|string|max:255',
            'ktp_number' => ['required', 'digits:' . $digits['ktp'], Rule::unique('internal_employees')->ignore($employeeId)],
            'kk_number' => 'nullable|digits:' . $digits['kk'],
            'birth_place' => 'nullable|string|max:255',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|in:male,female',
            'phone' => 'nullable|string|max:50',
            'education' => 'nullable|string|max:100',
            'religion' => 'nullable|string|max:50',
            'tax_status' => 'nullable|string|max:50',
            'address_ktp' => 'nullable|string',
            'address_domicile' => 'nullable|string',
            'mother_name' => 'nullable|string|max:255',
            'npwp' => 'nullable|regex:/^[0-9]{' . max($digits['npwp'] - 1, 1) . ',' . $digits['npwp'] . '}$/',
            'bpjs_kesehatan' => 'nullable|digits:' . $digits['bpjs_kes'],
            'bpjs_ketenagakerjaan' => 'nullable|digits:' . $digits['bpjs_tk'],
            'bank_name' => 'nullable|string|max:100',
            'bank_account_number' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'join_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive,resign',
        ];
    }

    /**
     * Custom error messages for digit validations.
     * Messages are generated dynamically based on configured digit lengths.
     *
     * @return array
     */
    private function getValidationMessages(): array
    {
        $digits = \App\Http\Controllers\SettingController::getValidationDigits();

        return [
            'ktp_number.digits' => 'Nomor KTP (NIK) harus terdiri dari tepat ' . $digits['ktp'] . ' digit angka.',
            'kk_number.digits' => 'Nomor Kartu Keluarga (KK) harus terdiri dari tepat ' . $digits['kk'] . ' digit angka.',
            'npwp.regex' => 'Nomor NPWP harus terdiri dari ' . max($digits['npwp'] - 1, 1) . ' atau ' . $digits['npwp'] . ' digit angka.',
            'bpjs_kesehatan.digits' => 'Nomor BPJS Kesehatan harus terdiri dari tepat ' . $digits['bpjs_kes'] . ' digit angka.',
            'bpjs_ketenagakerjaan.digits' => 'Nomor BPJS Ketenagakerjaan harus terdiri dari tepat ' . $digits['bpjs_tk'] . ' digit angka.',
        ];
    }

    public function importIndex()
    {
        $dbColumns = [
            [
                'group' => 'Data Karyawan Internal',
                'options' => [
                    ['key' => 'nik_aru', 'label' => 'NIK ARU'],
                    ['key' => 'name', 'label' => 'Nama Lengkap (Wajib)'],
                    ['key' => 'ktp_number', 'label' => 'NIK KTP (Wajib)'],
                    ['key' => 'gender', 'label' => 'Jenis Kelamin (L/P)'],
                    ['key' => 'birth_place', 'label' => 'Tempat Lahir'],
                    ['key' => 'birth_date', 'label' => 'Tanggal Lahir'],
                    ['key' => 'phone', 'label' => 'No Handphone'],
                    ['key' => 'email', 'label' => 'Email'],
                    ['key' => 'education', 'label' => 'Pendidikan Terakhir'],
                    ['key' => 'religion', 'label' => 'Agama'],
                    ['key' => 'tax_status', 'label' => 'Status Pajak/Tanggungan (PTKP)'],
                    ['key' => 'address_ktp', 'label' => 'Alamat Sesuai KTP'],
                    ['key' => 'address_domicile', 'label' => 'Alamat Sesuai Domisili'],
                    ['key' => 'mother_name', 'label' => 'Nama Ibu Kandung'],
                    ['key' => 'npwp', 'label' => 'Nomor NPWP'],
                    ['key' => 'bpjs_kesehatan', 'label' => 'No BPJS Kesehatan'],
                    ['key' => 'bpjs_ketenagakerjaan', 'label' => 'No BPJS Ketenagakerjaan'],
                    ['key' => 'bank_name', 'label' => 'Nama Bank'],
                    ['key' => 'bank_account_number', 'label' => 'Nomor Rekening'],
                    ['key' => 'position', 'label' => 'Jabatan'],
                    ['key' => 'department', 'label' => 'Departemen'],
                    ['key' => 'join_date', 'label' => 'Tanggal Masuk'],
                    ['key' => 'status', 'label' => 'Status Karyawan'],
                ],
            ]
        ];

        return Inertia::render('InternalEmployee/Import', [
            'dbColumns' => $dbColumns,
            'autoMapHints' => \App\Services\ImportService::AUTO_MAP_HINTS,
        ]);
    }

    public function upload(Request $request, \App\Services\InternalEmployeeImportService $importService)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240', function ($attribute, $value, $fail) {
                $ext = strtolower($value->getClientOriginalExtension());
                if (!in_array($ext, ['csv', 'txt', 'xlsx', 'xls'])) {
                    $fail('File harus berformat CSV (.csv) atau Excel (.xlsx, .xls).');
                }
            }],
        ]);

        try {
            $sessionId = \Illuminate\Support\Str::uuid()->toString();
            $result = $importService->parseAndCacheUpload($request->file('file'), $sessionId);

            return response()->json([
                'message' => 'File berhasil diunggah dan siap untuk mapping.',
                'session_id' => $sessionId,
                'sheets' => $result['sheets'],
                'auto_mapping' => [], // For simplicity, we could auto map based on hints in frontend
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal membaca file. Pastikan format file valid.'], 500);
        }
    }

    public function validateImport(Request $request, \App\Services\InternalEmployeeImportService $importService)
    {
        $request->validate([
            'session_id' => 'required|string',
            'mapping' => 'required|array',
            'header_row' => 'nullable|integer|min:1',
            'active_sheet_name' => 'nullable|string',
        ]);

        try {
            $result = $importService->validateAllRows(
                $request->input('session_id'),
                $request->input('mapping'),
                (int) $request->input('header_row', 1),
                $request->input('active_sheet_name')
            );
            
            if (!$result) {
                return response()->json(['message' => 'Sesi import telah kedaluwarsa. Silakan upload ulang file.'], 404);
            }

            return response()->json([
                'message' => 'Validasi selesai.',
                'summary' => $result['summary'],
                'results' => $result['results'],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Terjadi kesalahan saat validasi: ' . $e->getMessage()], 500);
        }
    }

    public function process(Request $request, \App\Services\InternalEmployeeImportService $importService)
    {
        $request->validate([
            'session_id' => 'required|string',
            'mapping' => 'required|array',
            'row_actions' => 'nullable|array',
            'header_row' => 'nullable|integer|min:1',
            'active_sheet_name' => 'nullable|string',
        ]);

        try {
            // Process synchronously
            $success = $importService->process(
                $request->input('session_id'),
                $request->input('mapping'),
                $request->input('row_actions', []),
                (int) $request->input('header_row', 1),
                $request->input('active_sheet_name')
            );
            
            if (!$success) {
                return response()->json(['message' => 'Sesi import telah kedaluwarsa. Silakan upload ulang file.'], 404);
            }

            return response()->json(['message' => 'Proses import telah selesai.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Terjadi kesalahan saat pemrosesan: ' . $e->getMessage()], 500);
        }
    }

    public function progress(string $sessionId, \App\Services\InternalEmployeeImportService $importService)
    {
        $progress = $importService->getProgress($sessionId);
        if (!$progress) {
            return response()->json(['message' => 'Data progress tidak ditemukan.'], 404);
        }
        return response()->json($progress);
    }

    public function downloadTemplate()
    {
        // Simple template generation using PhpSpreadsheet
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Import');
        
        $headers = [
            'NIK ARU', 'Nama Lengkap', 'NIK KTP', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir',
            'No Handphone', 'Email', 'Pendidikan Terakhir', 'Agama', 'Status Pajak', 'Alamat KTP',
            'Alamat Domisili', 'Nama Ibu Kandung', 'Nomor NPWP', 'No BPJS Kesehatan', 'No BPJS TK',
            'Nama Bank', 'Nomor Rekening', 'Jabatan', 'Departemen', 'Tanggal Masuk', 'Status'
        ];
        
        foreach ($headers as $index => $header) {
            $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue($col . '1', $header);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $tempPath = storage_path('app/temp_internal_template.xlsx');
        $writer->save($tempPath);
        
        return response()->download($tempPath, 'template_import_karyawan_internal.xlsx')->deleteFileAfterSend(true);
    }

    public function export()
    {
        $employees = InternalEmployee::all();
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Karyawan Internal');
        
        $headers = [
            'NIK ARU', 'Nama Lengkap', 'NIK KTP', 'No KK', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir',
            'No Handphone', 'Email', 'Pendidikan Terakhir', 'Agama', 'Status Pajak', 'Alamat KTP',
            'Alamat Domisili', 'Nama Ibu Kandung', 'Nomor NPWP', 'No BPJS Kesehatan', 'No BPJS TK',
            'Nama Bank', 'Nomor Rekening', 'Jabatan', 'Departemen', 'Tanggal Masuk', 'Status'
        ];
        
        foreach ($headers as $index => $header) {
            $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue($col . '1', $header);
            $sheet->getStyle($col . '1')->getFont()->setBold(true);
        }
        
        $row = 2;
        foreach ($employees as $emp) {
            $sheet->setCellValue('A' . $row, $emp->nik_aru);
            $sheet->setCellValue('B' . $row, $emp->name);
            $sheet->setCellValueExplicit('C' . $row, $emp->ktp_number, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValueExplicit('D' . $row, $emp->kk_number, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue('E' . $row, $emp->gender);
            $sheet->setCellValue('F' . $row, $emp->birth_place);
            $sheet->setCellValue('G' . $row, $emp->birth_date);
            $sheet->setCellValueExplicit('H' . $row, $emp->phone, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue('I' . $row, $emp->email);
            $sheet->setCellValue('J' . $row, $emp->education);
            $sheet->setCellValue('K' . $row, $emp->religion);
            $sheet->setCellValue('L' . $row, $emp->tax_status);
            $sheet->setCellValue('M' . $row, $emp->address_ktp);
            $sheet->setCellValue('N' . $row, $emp->address_domicile);
            $sheet->setCellValue('O' . $row, $emp->mother_name);
            $sheet->setCellValueExplicit('P' . $row, $emp->npwp, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValueExplicit('Q' . $row, $emp->bpjs_kesehatan, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValueExplicit('R' . $row, $emp->bpjs_ketenagakerjaan, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue('S' . $row, $emp->bank_name);
            $sheet->setCellValueExplicit('T' . $row, $emp->bank_account_number, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            $sheet->setCellValue('U' . $row, $emp->position);
            $sheet->setCellValue('V' . $row, $emp->department);
            $sheet->setCellValue('W' . $row, $emp->join_date);
            $sheet->setCellValue('X' . $row, $emp->status);
            $row++;
        }
        
        foreach (range(1, count($headers)) as $index) {
            $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $tempPath = storage_path('app/temp_internal_export.xlsx');
        $writer->save($tempPath);
        
        \App\Models\AuditLog::log('export', 'internal_employee', 'Mengekspor data karyawan internal');
        
        return response()->download($tempPath, 'export_karyawan_internal_' . date('Ymd_His') . '.xlsx')->deleteFileAfterSend(true);
    }
}
