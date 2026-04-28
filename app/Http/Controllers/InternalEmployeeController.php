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
     * Mirrors the Worker validation rules with additional fields for position, department, etc.
     *
     * @param int|null $employeeId Optional employee ID to ignore for unique checks during updates.
     * @return array
     */
    private function getValidationRules(?int $employeeId = null): array
    {
        return [
            'nik_aru' => ['nullable', 'string', 'max:50', Rule::unique('internal_employees')->ignore($employeeId)],
            'name' => 'required|string|max:255',
            'ktp_number' => ['required', 'digits:16', Rule::unique('internal_employees')->ignore($employeeId)],
            'kk_number' => 'nullable|digits:16',
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
            'npwp' => 'nullable|regex:/^[0-9]{15,16}$/',
            'bpjs_kesehatan' => 'nullable|digits:13',
            'bpjs_ketenagakerjaan' => 'nullable|digits:11',
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
     *
     * @return array
     */
    private function getValidationMessages(): array
    {
        return [
            'ktp_number.digits' => 'Nomor KTP (NIK) harus terdiri dari tepat 16 digit angka.',
            'kk_number.digits' => 'Nomor Kartu Keluarga (KK) harus terdiri dari tepat 16 digit angka.',
            'npwp.regex' => 'Nomor NPWP harus terdiri dari 15 atau 16 digit angka.',
            'bpjs_kesehatan.digits' => 'Nomor BPJS Kesehatan harus terdiri dari tepat 13 digit angka.',
            'bpjs_ketenagakerjaan.digits' => 'Nomor BPJS Ketenagakerjaan harus terdiri dari tepat 11 digit angka.',
        ];
    }
}
