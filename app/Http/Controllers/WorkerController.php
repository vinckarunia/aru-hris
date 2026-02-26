<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;

/**
 * Class WorkerController
 *
 * Handles CRUD operations for the Worker module.
 */
class WorkerController extends Controller
{
    public function index(): Response
    {
        $workers = Worker::latest()->get();
        return Inertia::render('Worker/Index', ['workers' => $workers]);
    }

    public function create(): Response
    {
        return Inertia::render('Worker/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->getValidationRules(), $this->getValidationMessages());

        Worker::create($validated);

        return redirect()->route('workers.index')->with('message', 'Pekerja berhasil ditambahkan.');
    }

    public function show(Worker $worker): Response
    {
        $worker->load(['assignments.project', 'assignments.department']);
        return Inertia::render('Worker/Show', ['worker' => $worker]);
    }

    public function edit(Worker $worker): Response
    {
        return Inertia::render('Worker/Edit', ['worker' => $worker]);
    }

    public function update(Request $request, Worker $worker): RedirectResponse
    {
        $validated = $request->validate($this->getValidationRules($worker->id), $this->getValidationMessages());

        $worker->update($validated);

        return redirect()->route('workers.show', $worker->id)->with('message', 'Data pekerja berhasil diperbarui.');
    }

    public function destroy(Worker $worker): RedirectResponse
    {
        $worker->delete();
        return redirect()->route('workers.index')->with('message', 'Pekerja berhasil dihapus.');
    }

    /**
     * Define the strict validation rules for Indonesian identity numbers.
     */
    private function getValidationRules(?int $workerId = null): array
    {
        return [
            'nik_aru' => ['nullable', 'string', 'max:50', Rule::unique('workers')->ignore($workerId)],
            'name' => 'required|string|max:255',
            'ktp_number' => ['required', 'digits:16', Rule::unique('workers')->ignore($workerId)],
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
        ];
    }

    /**
     * Custom error messages for digit validations.
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