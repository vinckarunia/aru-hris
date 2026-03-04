<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractCompensation;
use App\Models\Assignment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Class ContractController
 *
 * Handles CRUD operations for the Contract module.
 * Renders views using Inertia.js.
 * 
 * This controller manages both the Contract and its related ContractCompensation to ensure data integrity and consistency.
 */
class ContractController extends Controller
{
    /**
     * Show the form for creating a new contract for a specific assignment.
     * 
     * @param Request $request
     * @return Response
     */
    public function create(Request $request): Response
    {
        $request->validate(['assignment_id' => 'required|exists:assignments,id']);
        $assignment = Assignment::with(['worker', 'project', 'branch'])->findOrFail($request->assignment_id);

        return Inertia::render('Contract/Create', ['assignment' => $assignment]);
    }

    /**
     * Store a newly created contract and its compensation in storage.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->getRules($request), $this->getMessages());

        // Use DB transaction to ensure both Contract and ContractCompensation are created successfully or rolled back together
        DB::transaction(function () use ($validated, $request) {
            $contract = Contract::create([
                'assignment_id' => $validated['assignment_id'],
                'contract_type' => $validated['contract_type'],
                'pkwt_type' => $validated['pkwt_type'],
                'pkwt_number' => $validated['pkwt_number'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'duration_months' => $validated['duration_months'],
                'evaluation_notes' => $validated['evaluation_notes'],
            ]);

            ContractCompensation::create([
                'contract_id' => $contract->id,
                'base_salary' => $validated['base_salary'],
                'salary_rate' => $validated['salary_rate'],
                'meal_allowance' => $validated['meal_allowance'] ?? 0,
                'transport_allowance' => $validated['transport_allowance'] ?? 0,
                'allowance_rate' => $validated['allowance_rate'] ?? 'monthly',
                'overtime_weekday_rate' => $validated['overtime_weekday_rate'] ?? 0,
                'overtime_holiday_rate' => $validated['overtime_holiday_rate'] ?? 0,
                'overtime_rate' => $validated['overtime_rate'] ?? 'hourly',
            ]);
        });

        return redirect()->route('assignments.show', $request->assignment_id)->with('message', 'Kontrak & Kompensasi berhasil dibuat!');
    }

    /**
     * Display the specified contract details including its compensation and related assignment info.
     *
     * @param Contract $contract
     * @return Response
     */
    public function show(Contract $contract): Response
    {
        $contract->load(['compensation', 'assignment.worker', 'assignment.project', 'assignment.branch']);
        return Inertia::render('Contract/Show', ['contract' => $contract]);
    }

    /**
     * Show the form for editing the specified contract and its compensation.
     *
     * @param Contract $contract
     * @return Response
     */
    public function edit(Contract $contract): Response
    {
        $contract->load(['compensation', 'assignment.worker', 'assignment.project']);
        return Inertia::render('Contract/Edit', ['contract' => $contract]);
    }

    /**
     * Update the specified contract and its compensation in storage.
     *
     * @param Request $request
     * @param Contract $contract
     * @return RedirectResponse
     */
    public function update(Request $request, Contract $contract): RedirectResponse
    {
        $validated = $request->validate($this->getRules($request, $contract->id), $this->getMessages());

        DB::transaction(function () use ($validated, $contract) {
            $contract->update([
                'contract_type' => $validated['contract_type'],
                'pkwt_type' => $validated['pkwt_type'],
                'pkwt_number' => $validated['pkwt_number'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'duration_months' => $validated['duration_months'],
                'evaluation_notes' => $validated['evaluation_notes'],
            ]);

            if ($contract->compensation) {
                $contract->compensation->update([
                    'base_salary' => $validated['base_salary'],
                    'salary_rate' => $validated['salary_rate'],
                    'meal_allowance' => $validated['meal_allowance'] ?? 0,
                    'transport_allowance' => $validated['transport_allowance'] ?? 0,
                    'allowance_rate' => $validated['allowance_rate'] ?? 'monthly',
                    'overtime_weekday_rate' => $validated['overtime_weekday_rate'] ?? 0,
                    'overtime_holiday_rate' => $validated['overtime_holiday_rate'] ?? 0,
                    'overtime_rate' => $validated['overtime_rate'] ?? 'hourly',
                ]);
            }
        });

        return redirect()->route('contracts.show', $contract->id)->with('message', 'Kontrak & Kompensasi berhasil diperbarui!');
    }

    /**
     * Remove the specified contract and its compensation from storage.
     * 
     * @param Contract $contract
     * @return RedirectResponse
     */
    public function destroy(Contract $contract): RedirectResponse
    {
        $assignmentId = $contract->assignment_id;
        $contract->delete();
        
        return redirect()->route('assignments.show', $assignmentId)->with('message', 'Kontrak berhasil dihapus.');
    }

    /**
     * Get validation rules for storing/updating contracts and compensations.
     *
     * @param Request $request
     * @param int|null $contractId
     * @return array
     */
    private function getRules(Request $request, ?int $contractId = null): array
    {
        return [
            // Contract validation rules
            'assignment_id' => 'required|exists:assignments,id',
            'contract_type' => 'required|in:Kontrak,Harian',
            'pkwt_type' => 'nullable|in:PKWT,PKWTT',
            'pkwt_number' => [
                'nullable', 'integer', 'min:1',
                Rule::unique('contracts')->where('assignment_id', $request->assignment_id)->ignore($contractId)
            ],
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration_months' => 'nullable|integer|min:1',
            'evaluation_notes' => 'nullable|string',

            // Compensation validation rules
            'base_salary' => 'required|numeric|min:0',
            'salary_rate' => 'required|in:hourly,daily,monthly,yearly',
            'meal_allowance' => 'nullable|numeric|min:0',
            'transport_allowance' => 'nullable|numeric|min:0',
            'allowance_rate' => 'nullable|in:hourly,daily,monthly,yearly',
            'overtime_weekday_rate' => 'nullable|numeric|min:0',
            'overtime_holiday_rate' => 'nullable|numeric|min:0',
            'overtime_rate' => 'nullable|in:hourly,daily,monthly,yearly',
        ];
    }

    /**
     * Get custom validation messages for contract and compensation rules.
     * 
     * @return array
     */
    private function getMessages(): array
    {
        return [
            'pkwt_number.unique' => 'Nomor PKWT ini sudah ada di dalam penempatan ini.',
        ];
    }
}