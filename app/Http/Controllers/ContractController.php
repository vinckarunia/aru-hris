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
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403);

        $request->validate(['assignment_id' => 'required|exists:assignments,id']);
        $assignment = Assignment::with(['worker', 'project', 'branches'])->findOrFail($request->assignment_id);

        // PIC: ensure assignment belongs to their project
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Penempatan ini di luar wewenang project Anda.');
            }
        }

        // Suggest start date from the latest contract's end_date + 1 day
        $suggestedStartDate = null;
        $suggestedPkwtNumber = null;
        $latestContract = \App\Models\Contract::where('assignment_id', $assignment->id)
            ->whereNotNull('end_date')
            ->orderByDesc('end_date')
            ->first();

        if ($latestContract && $latestContract->end_date) {
            $suggestedStartDate = \Carbon\Carbon::parse($latestContract->end_date)->addDay()->format('Y-m-d');
        }

        // Suggest next pkwt_number based on the latest contract
        $suggestedPkwtNumber = null;
        if ($latestContract) {
            if ($latestContract->pkwt_number !== null) {
                $suggestedPkwtNumber = (int) $latestContract->pkwt_number + 1;
            }
            // If the latest contract had no pkwt_number, we leave it null
        }

        return Inertia::render('Contract/Create', [
            'assignment' => $assignment,
            'suggestedStartDate' => $suggestedStartDate,
            'suggestedPkwtNumber' => $suggestedPkwtNumber,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403);

        $validated = $request->validate($this->getRules($request), $this->getMessages());

        // PIC: route through DataRequest for admin approval
        if ($user->isPic()) {
            $assignment = Assignment::findOrFail($validated['assignment_id']);
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($assignment->project_id, $projectIds)) abort(403);

            \App\Models\DataRequest::create([
                'worker_id' => $assignment->worker_id,
                'project_id' => $assignment->project_id,
                'request_type' => 'data_change',
                'requested_by' => $user->id,
                'requested_fields' => array_keys($validated),
                'requested_data' => array_merge(['_action' => 'create_contract'], $validated),
                'notes' => 'Penambahan Kontrak Baru oleh PIC',
                'status' => 'pending',
                'pic_status' => 'approved',
                'pic_reviewed_by' => $user->id,
                'pic_reviewed_at' => now(),
            ]);

            return redirect()->route('data-requests.index')
                ->with('message', 'Pengajuan kontrak baru berhasil dikirim ke Admin untuk direview.');
        }

        // Admin: direct DB write
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
                'allowance' => $validated['allowance'] ?? 0,
                'attendance_allowance' => $validated['attendance_allowance'] ?? 0,
                'performance_bonus' => $validated['performance_bonus'] ?? 0,
                'allowance_rate' => $validated['allowance_rate'] ?? 'monthly',
                'overtime_weekday_rate' => $validated['overtime_weekday_rate'] ?? 0,
                'overtime_holiday_rate' => $validated['overtime_holiday_rate'] ?? 0,
                'overtime_rate' => $validated['overtime_rate'] ?? 'hourly',
            ]);
        });

        \App\Models\AuditLog::log('create', 'contract', "Membuat kontrak baru untuk assignment #{$request->assignment_id}", ['assignment_id' => $request->assignment_id]);

        return redirect()->route('assignments.show', \App\Models\Assignment::encodeHashid($request->assignment_id))->with('message', 'Kontrak & Kompensasi berhasil dibuat!');
    }

    /**
     * Display the specified resource.
     *
     * @param Request $request
     * @param Contract $contract
     * @return Response
     */
    public function show(Request $request, Contract $contract): Response
    {
        $user = $request->user();

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            $contract->load('assignment');
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Kontrak ini di luar wewenang project Anda.');
            }
        } elseif (!$user->isAdminOrAbove()) {
            abort(403, 'Akses ditolak. Detail kontrak dan kompensasi hanya dapat diakses oleh Admin.');
        }

        $contract->load(['compensation', 'assignment.worker', 'assignment.project', 'assignment.branches', 'hardcopyReceivedByUser']);

        return Inertia::render('Contract/Show', [
            'contract' => $contract
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param Request $request
     * @param Contract $contract
     * @return Response
     */
    public function edit(Request $request, Contract $contract): Response
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403);

        // PIC: ensure contract belongs to their project
        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            $contract->load('assignment');
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Kontrak ini di luar wewenang project Anda.');
            }
        }

        $contract->load(['compensation', 'assignment.worker', 'assignment.project', 'assignment.branches']);
        return Inertia::render('Contract/Edit', ['contract' => $contract]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param Request $request
     * @param Contract $contract
     * @return RedirectResponse
     */
    public function update(Request $request, Contract $contract): RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403);
        
        $validated = $request->validate($this->getRules($request, $contract->id), $this->getMessages());

        // PIC: route through DataRequest for admin approval
        if ($user->isPic()) {
            $contract->load('assignment');
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) abort(403);

            \App\Models\DataRequest::create([
                'worker_id' => $contract->assignment->worker_id,
                'project_id' => $contract->assignment->project_id,
                'request_type' => 'data_change',
                'requested_by' => $user->id,
                'requested_fields' => array_keys($validated),
                'requested_data' => array_merge(['_action' => 'update_contract', 'contract_id' => $contract->id], $validated),
                'notes' => 'Perubahan Kontrak & Kompensasi oleh PIC',
                'status' => 'pending',
                'pic_status' => 'approved',
                'pic_reviewed_by' => $user->id,
                'pic_reviewed_at' => now(),
            ]);

            return redirect()->route('contracts.show', $contract)
                ->with('message', 'Pengajuan perubahan kontrak berhasil dikirim ke Admin untuk direview.');
        }

        // Admin: direct DB write
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
                    'allowance' => $validated['allowance'] ?? 0,
                    'attendance_allowance' => $validated['attendance_allowance'] ?? 0,
                    'performance_bonus' => $validated['performance_bonus'] ?? 0,
                    'allowance_rate' => $validated['allowance_rate'] ?? 'monthly',
                    'overtime_weekday_rate' => $validated['overtime_weekday_rate'] ?? 0,
                    'overtime_holiday_rate' => $validated['overtime_holiday_rate'] ?? 0,
                    'overtime_rate' => $validated['overtime_rate'] ?? 'hourly',
                ]);
            }
        });

        \App\Models\AuditLog::log('update', 'contract', "Memperbarui kontrak #{$contract->id}", ['contract_id' => $contract->id]);

        return redirect()->route('contracts.show', $contract)->with('message', 'Kontrak & Kompensasi berhasil diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     * 
     * @param Request $request
     * @param Contract $contract
     * @return RedirectResponse
     */
    public function destroy(Request $request, Contract $contract): RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403);
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403);

        // PIC: route deletion through DataRequest for admin approval
        if ($user->isPic()) {
            $contract->load('assignment');
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) abort(403);

            \App\Models\DataRequest::create([
                'worker_id' => $contract->assignment->worker_id,
                'project_id' => $contract->assignment->project_id,
                'request_type' => 'data_change',
                'requested_by' => $user->id,
                'requested_fields' => ['contract_id'],
                'requested_data' => ['_action' => 'delete_contract', 'contract_id' => $contract->id],
                'notes' => 'Penghapusan Kontrak oleh PIC',
                'status' => 'pending',
                'pic_status' => 'approved',
                'pic_reviewed_by' => $user->id,
                'pic_reviewed_at' => now(),
            ]);

            return redirect()->route('contracts.show', $contract)
                ->with('message', 'Pengajuan penghapusan kontrak berhasil dikirim ke Admin untuk direview.');
        }

        $assignmentId = $contract->assignment_id;
        \App\Models\AuditLog::log('delete', 'contract', "Menghapus kontrak #{$contract->id}", ['contract_id' => $contract->id, 'assignment_id' => $assignmentId]);
        $contract->delete();
        
        return redirect()->route('assignments.show', \App\Models\Assignment::encodeHashid($assignmentId))->with('message', 'Kontrak berhasil dihapus.');
    }

    /**
     * Toggle the hardcopy received status for a contract.
     *
     * Allows PIC or Admin to mark whether the physical contract
     * hardcopy has been received from the worker.
     *
     * @param Request $request
     * @param Contract $contract
     * @return \Illuminate\Http\RedirectResponse
     */
    public function toggleHardcopy(Request $request, Contract $contract): \Illuminate\Http\RedirectResponse
    {
        $user = $request->user();
        if ($user->isWorker()) abort(403, 'Akses ditolak.');
        if (!$user->isAdminOrAbove() && !$user->isPic()) abort(403, 'Akses ditolak.');

        $contract->load('assignment.worker');

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!$contract->assignment || !in_array($contract->assignment->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Kontrak ini di luar wewenang project Anda.');
            }
        }

        $isCurrentlyReceived = !is_null($contract->hardcopy_received_at);
        $workerName = $contract->assignment->worker->name ?? 'Unknown';

        if ($isCurrentlyReceived) {
            // Un-toggle: clear the fields
            $contract->update([
                'hardcopy_received_at' => null,
                'hardcopy_received_by' => null,
            ]);
            $logMessage = "Membatalkan konfirmasi penerimaan hardcopy kontrak #{$contract->id} dari karyawan: {$workerName}";
        } else {
            // Toggle on: set the fields
            $contract->update([
                'hardcopy_received_at' => now(),
                'hardcopy_received_by' => $user->id,
            ]);
            $logMessage = "Mengkonfirmasi penerimaan hardcopy kontrak #{$contract->id} dari karyawan: {$workerName}";
        }

        \App\Models\AuditLog::log('update', 'contract', $logMessage, [
            'contract_id' => $contract->id,
            'hardcopy_received' => !$isCurrentlyReceived,
        ]);

        return redirect()->back()->with('message', $isCurrentlyReceived
            ? 'Konfirmasi penerimaan hardcopy dibatalkan.'
            : 'Hardcopy kontrak dikonfirmasi sudah diterima.');
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
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration_months' => 'nullable|integer|min:1',
            'evaluation_notes' => 'nullable|string',

            // Compensation validation rules
            'base_salary' => 'required|numeric|min:0',
            'salary_rate' => 'required|in:hourly,daily,monthly,yearly',
            'meal_allowance' => 'nullable|numeric|min:0',
            'transport_allowance' => 'nullable|numeric|min:0',
            'allowance' => 'nullable|numeric|min:0',
            'attendance_allowance' => 'nullable|numeric|min:0',
            'performance_bonus' => 'nullable|numeric|min:0',
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
