<?php

namespace App\Http\Controllers;

use App\Models\DataRequest;
use App\Models\Project;
use App\Models\Worker;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class DataRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        $type = $request->input('type', 'data_change'); // Tab selection

        $query = DataRequest::with(['worker', 'project:id,name', 'requester:id,name,role', 'reviewer:id,name', 'picReviewer:id,name'])
                    ->where('request_type', $type);

        if ($user->isWorker()) {
            $query->where('worker_id', $user->worker_id);
        } elseif ($user->isPic()) {
            // Get project_ids handled by this PIC
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id') : [];
            $query->whereIn('project_id', $projectIds);
        }
        // Super Admin and Admin ARU can view all records

        $status = $request->input('status');

        if ($sort === 'worker_name') {
            $query->join('workers', 'data_requests.worker_id', '=', 'workers.id')
                  ->select('data_requests.*')
                  ->orderBy('workers.name', $direction);
        } else {
            $query->orderBy('data_requests.' . $sort, $direction);
        }

        if ($status === 'pending') {
            if ($user->isAdminOrAbove()) {
                $query->where('data_requests.status', 'pending')
                      ->where(function ($q) {
                          $q->where('pic_status', 'approved')
                            ->orWhereNull('pic_status');
                      });
            } else if ($user->isPic()) {
                $query->where('pic_status', 'pending');
            } else {
                $query->where('data_requests.status', 'pending');
            }
        } elseif ($status) {
            $query->where('data_requests.status', $status);
        }

        return Inertia::render('DataRequest/Index', [
            'dataRequests' => $query->get(),
            'filters' => [
                'sort' => $sort,
                'direction' => $direction,
                'status' => $status,
                'type' => $type,
            ],
        ]);
    }

    /**
     * Show the form for creating a new edit request.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        
        $workerId = $request->query('worker_id') ?? ($user->isWorker() ? $user->worker_id : null);
        if (!$workerId) {
            abort(403, 'Akses ditolak.');
        }

        $worker = Worker::with(['assignments.project'])->findOrFail($workerId);

        if ($user->isWorker() && $user->worker_id !== $worker->id) {
            abort(403, 'Anda hanya dapat mengajukan perubahan untuk data Anda sendiri.');
        }

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            $hasActiveAssignmentInPicProject = $worker->assignments()
                ->whereIn('status', ['active', 'probation', 'extended'])
                ->whereIn('project_id', $projectIds)
                ->exists();
                
            if (!$hasActiveAssignmentInPicProject) {
                abort(403, 'Akses ditolak. Karyawan ini tidak berada di project Anda.');
            }
        }

        return Inertia::render('DataRequest/Create', [
            'worker' => $worker
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'worker_id' => 'required|exists:workers,id',
            'project_id' => 'nullable|exists:projects,id',
            'request_type' => 'required|in:new_data,data_change,status_change',
            'requested_fields' => 'required|array',
            'requested_data' => 'required|array', // Actual form payload
            'notes' => 'nullable|string',
        ]);

        $workerId = $validated['worker_id'];

        if ($user->isWorker() && $user->worker_id !== (int) $workerId) {
            abort(403, 'Anda hanya dapat mengajukan pengeditan untuk diri sendiri.');
        }

        if ($user->isPic()) {
            $worker = Worker::findOrFail($workerId);
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            $hasActiveAssignmentInPicProject = $worker->assignments()
                ->whereIn('status', ['active', 'probation', 'extended'])
                ->whereIn('project_id', $projectIds)
                ->exists();
                
            if (!$hasActiveAssignmentInPicProject && $validated['request_type'] !== 'new_data') {
                abort(403, 'Akses ditolak. Karyawan ini tidak berada di project Anda.');
            }
        }

        $picStatus = 'pending';
        $picReviewedBy = null;
        $picReviewedAt = null;

        if ($user->isPic()) {
            $picStatus = 'approved';
            $picReviewedBy = $user->id;
            $picReviewedAt = now();
        }

        DataRequest::create([
            'worker_id' => $workerId,
            'project_id' => $validated['project_id'],
            'requested_by' => $user->id,
            'request_type' => $validated['request_type'],
            'requested_fields' => $validated['requested_fields'],
            'requested_data' => $validated['requested_data'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
            'pic_status' => $picStatus,
            'pic_reviewed_by' => $picReviewedBy,
            'pic_reviewed_at' => $picReviewedAt,
        ]);

        return redirect()->route('data-requests.index')->with('message', 'Pengajuan perubahan berhasil dikirim.');
    }

    public function review(Request $request, DataRequest $dataRequest): RedirectResponse
    {
        $user = $request->user();

        // Access validation: ADMIN_ARU, SUPER_ADMIN, PIC
        if (!$user->isAdminOrAbove() && !$user->isPic()) {
            abort(403, 'Akses ditolak.');
        }

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'review_notes' => 'nullable|string',
        ]);

        if ($user->isPic()) {
            $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            if (!in_array($dataRequest->project_id, $projectIds)) {
                abort(403, 'Akses ditolak. Pengajuan ini di luar wewenang Anda.');
            }

            $updateData = [
                'pic_status' => $validated['status'],
                'pic_reviewed_by' => $user->id,
                'pic_reviewed_at' => now(),
            ];

            if ($validated['status'] === 'rejected') {
                $updateData['status'] = 'rejected';
            }

            $dataRequest->update($updateData);

            if ($validated['status'] === 'rejected' && is_array($dataRequest->requested_data)) {
                if (isset($dataRequest->requested_data['_action']) && $dataRequest->requested_data['_action'] === 'upload_document') {
                    if (isset($dataRequest->requested_data['file_path'])) {
                        \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->delete($dataRequest->requested_data['file_path']);
                    }
                }
            }

            return redirect()->back()->with('message', 'Review PIC berhasil disimpan.');
        }

        // Admin Review Logic
        $dataRequest->update([
            'status' => $validated['status'],
            'reviewed_by' => $user->id,
            'review_notes' => $validated['review_notes'],
            'reviewed_at' => now(),
        ]);

        $message = 'Review status berhasil diupdate.';

        // If Approved, automatically apply the requested changes payload to the actual Worker record
        if ($validated['status'] === 'approved' && is_array($dataRequest->requested_data)) {
            $worker = $this->applyApprovedChanges($dataRequest, $user);

            if ($worker) {
                // Build post-approval data for frontend popup
                $bpjsMissing = empty($worker->bpjs_kesehatan) || empty($worker->bpjs_ketenagakerjaan);
                $latestAssignment = $worker->assignments()->latest()->first();

                $postApproval = [
                    'worker_name' => $worker->name,
                    'nik_aru' => $worker->nik_aru,
                    'bpjs_missing' => $bpjsMissing,
                    'assignment_id' => $latestAssignment?->getRouteKey(),
                    'request_type' => $dataRequest->request_type,
                ];

                if ($bpjsMissing) {
                    $message = 'Request disetujui. MOHON INGATKAN KARYAWAN UNTUK SEGERA MENDAFTARKAN BPJS.';
                }

                // BPJS Email sending is now handled globally via Worker::updated event in the Worker model.
            }
        } else if ($validated['status'] === 'rejected' && is_array($dataRequest->requested_data)) {
            // Cleanup orphaned unverified files if an upload request is rejected
            if (isset($dataRequest->requested_data['_action']) && $dataRequest->requested_data['_action'] === 'upload_document') {
                if (isset($dataRequest->requested_data['file_path'])) {
                    \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->delete($dataRequest->requested_data['file_path']);
                }
            }
        }

        $flash = ['message' => $message];
        if (isset($postApproval)) {
            $flash['post_approval'] = $postApproval;
        }

        return redirect()->back()->with($flash);
    }

    /**
     * Bulk review multiple DataRequests at once.
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function bulkReview(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (!$user->isAdminOrAbove() && !$user->isPic()) {
            abort(403, 'Akses ditolak.');
        }

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|string',
            'status' => 'required|in:approved,rejected',
            'review_notes' => 'nullable|string',
        ]);

        $postApprovalList = [];
        $processedCount = 0;

        foreach ($validated['ids'] as $hashId) {
            $decodedId = DataRequest::decodeHashid($hashId);
            if (!$decodedId) continue;
            $dataRequest = DataRequest::findOrFail($decodedId);

            // Skip already-processed requests
            if ($user->isPic() && $dataRequest->pic_status !== 'pending') continue;
            if ($user->isAdminOrAbove() && $dataRequest->status !== 'pending') continue;
            if ($user->isAdminOrAbove() && $dataRequest->pic_status === 'pending') continue; // PIC hasn't reviewed yet

            if ($user->isPic()) {
                $projectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
                if (!in_array($dataRequest->project_id, $projectIds)) continue;

                $updateData = [
                    'pic_status' => $validated['status'],
                    'pic_reviewed_by' => $user->id,
                    'pic_reviewed_at' => now(),
                ];
                if ($validated['status'] === 'rejected') {
                    $updateData['status'] = 'rejected';
                }
                $dataRequest->update($updateData);
                $processedCount++;
            } else {
                // Admin: reuse the single review logic by calling review internally
                $dataRequest->update([
                    'status' => $validated['status'],
                    'reviewed_by' => $user->id,
                    'review_notes' => $validated['review_notes'],
                    'reviewed_at' => now(),
                ]);

                if ($validated['status'] === 'approved' && is_array($dataRequest->requested_data)) {
                    $worker = $this->applyApprovedChanges($dataRequest, $user);

                    if ($worker) {
                        $bpjsMissing = empty($worker->bpjs_kesehatan) || empty($worker->bpjs_ketenagakerjaan);
                        $latestAssignment = $worker->assignments()->latest()->first();
                        $postApprovalList[] = [
                            'worker_name' => $worker->name,
                            'nik_aru' => $worker->nik_aru,
                            'bpjs_missing' => $bpjsMissing,
                            'assignment_id' => $latestAssignment?->getRouteKey(),
                            'request_type' => $dataRequest->request_type,
                        ];
                    }
                } elseif ($validated['status'] === 'rejected' && is_array($dataRequest->requested_data)) {
                    if (isset($dataRequest->requested_data['_action']) && $dataRequest->requested_data['_action'] === 'upload_document') {
                        if (isset($dataRequest->requested_data['file_path'])) {
                            \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->delete($dataRequest->requested_data['file_path']);
                        }
                    }
                }
                $processedCount++;
            }
        }

        $flash = ['message' => "{$processedCount} data request berhasil di-" . ($validated['status'] === 'approved' ? 'setujui' : 'tolak') . '.'];
        if (!empty($postApprovalList)) {
            $flash['post_approval_list'] = $postApprovalList;
        }

        return redirect()->back()->with($flash);
    }

    /**
     * Apply the approved changes from a DataRequest to the actual database records.
     * Extracted from review() for reuse in bulkReview().
     *
     * @param DataRequest $dataRequest
     * @param \App\Models\User $user
     * @return Worker|null
     */
    private function applyApprovedChanges(DataRequest $dataRequest, $user): ?Worker
    {
        $worker = null;

        if ($dataRequest->request_type === 'new_data') {
            $workerFillable = array_intersect_key($dataRequest->requested_data, array_flip((new Worker)->getFillable()));
            $worker = Worker::create($workerFillable);
            $dataRequest->update(['worker_id' => $worker->id]);

            if ($dataRequest->project_id) {
                $project = \App\Models\Project::with('branches')->find($dataRequest->project_id);
                if ($project) {
                    $assignmentFillable = array_intersect_key($dataRequest->requested_data, array_flip((new \App\Models\Assignment)->getFillable()));
                    $assignmentFillable = array_merge([
                        'worker_id' => $worker->id,
                        'project_id' => $project->id,
                        'branch_id' => $dataRequest->requested_data['branch_id'] ?? ($project->branches->first()->id ?? 1),
                        'position' => $dataRequest->requested_data['position'] ?? null,
                        'hire_date' => now(),
                        'status' => 'active',
                    ], $assignmentFillable);

                    $assignment = \App\Models\Assignment::create($assignmentFillable);
                    $newNik = (new AssignmentController)->generateNikForProject($project);
                    $worker->update(['nik_aru' => $newNik]);

                    $latestContractId = null;
                    if (!empty($dataRequest->requested_data['contracts'])) {
                        foreach ($dataRequest->requested_data['contracts'] as $c) {
                            $c['assignment_id'] = $assignment->id;
                            $contract = \App\Models\Contract::create($c);
                            if ($c['pkwt_type'] === 'PKWTT') {
                                $latestContractId = $contract->id;
                            } else if (!$latestContractId) {
                                $latestContractId = $contract->id;
                            }
                        }
                    }

                    if ($latestContractId && !empty($dataRequest->requested_data['compensation'])) {
                        $compData = $dataRequest->requested_data['compensation'];
                        $compData['contract_id'] = $latestContractId;
                        \App\Models\ContractCompensation::create($compData);
                    }

                    if (!empty($dataRequest->requested_data['family_members'])) {
                        foreach ($dataRequest->requested_data['family_members'] as $fm) {
                            $fm['worker_id'] = $worker->id;
                            \App\Models\FamilyMember::create($fm);
                        }
                    }
                }
            }
        } else {
            $worker = $dataRequest->worker;
            if ($worker) {
                if (isset($dataRequest->requested_data['_action'])) {
                    $action = $dataRequest->requested_data['_action'];
                    if ($action === 'add_family') {
                        \App\Models\FamilyMember::create(array_diff_key($dataRequest->requested_data, ['_action' => '']));
                    } else if ($action === 'update_family') {
                        $fm = \App\Models\FamilyMember::find($dataRequest->requested_data['family_id']);
                        if ($fm) $fm->update(array_diff_key($dataRequest->requested_data, ['_action' => '', 'family_id' => '']));
                    } else if ($action === 'delete_family') {
                        $fm = \App\Models\FamilyMember::find($dataRequest->requested_data['family_id']);
                        if ($fm) $fm->delete();
                    } else if ($action === 'upload_document') {
                        $existing = \App\Models\Document::where('worker_id', $worker->id)
                            ->where('type', $dataRequest->requested_data['type'])
                            ->first();
                        if ($existing) {
                            \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->delete($existing->file_path);
                            $existing->delete();
                        }
                        \App\Models\Document::create([
                            'worker_id' => $worker->id,
                            'type' => $dataRequest->requested_data['type'],
                            'file_path' => $dataRequest->requested_data['file_path'],
                            'is_verified' => true,
                            'verified_by' => $user->id,
                            'verified_at' => now(),
                        ]);
                    } else if ($action === 'delete_document') {
                        $doc = \App\Models\Document::find($dataRequest->requested_data['document_id']);
                        if ($doc) {
                            \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'))->delete($doc->file_path);
                            $doc->delete();
                        }
                    } else if ($action === 'update_assignment') {
                        $assignment = \App\Models\Assignment::find($dataRequest->requested_data['assignment_id']);
                        if ($assignment) {
                            $updateFields = array_diff_key($dataRequest->requested_data, ['_action' => '', 'assignment_id' => '']);
                            $assignmentFillable = array_intersect_key($updateFields, array_flip((new \App\Models\Assignment)->getFillable()));
                            $assignment->update($assignmentFillable);
                        }
                    } else if ($action === 'bulk_import_update_worker') {
                        // 1. Update Worker (ignore nulls & ktp_number)
                        $workerFillable = array_intersect_key($dataRequest->requested_data, array_flip((new \App\Models\Worker)->getFillable()));
                        $updateData = array_filter($workerFillable, fn($v) => $v !== null && $v !== '');
                        unset($updateData['ktp_number']);
                        $worker->update($updateData);

                        // 2. Update/Create Assignment
                        $assignmentFillable = array_intersect_key($dataRequest->requested_data, array_flip((new \App\Models\Assignment)->getFillable()));
                        if (!empty($assignmentFillable)) {
                            $existingAssignment = \App\Models\Assignment::where('worker_id', $worker->id)->first();
                            if ($existingAssignment) {
                                $existingAssignment->update($assignmentFillable);
                                $assignment = $existingAssignment;
                            } else {
                                $assignmentFillable['worker_id'] = $worker->id;
                                $assignment = \App\Models\Assignment::create($assignmentFillable);
                                
                                $project = \App\Models\Project::find($assignmentFillable['project_id'] ?? null);
                                if ($project && empty($worker->nik_aru)) {
                                    $newNik = (new AssignmentController)->generateNikForProject($project);
                                    $worker->update(['nik_aru' => $newNik]);
                                }
                            }

                            // 3. Contracts
                            $latestContractId = null;
                            if (!empty($dataRequest->requested_data['contracts'])) {
                                foreach ($dataRequest->requested_data['contracts'] as $c) {
                                    $c['assignment_id'] = $assignment->id;
                                    $contract = \App\Models\Contract::updateOrCreate(
                                        [
                                            'assignment_id' => $assignment->id,
                                            'contract_type' => $c['contract_type'] ?? 'Kontrak',
                                            'pkwt_type' => $c['pkwt_type'] ?? null,
                                            'pkwt_number' => $c['pkwt_number'] ?? null,
                                        ],
                                        $c
                                    );
                                    if (($c['pkwt_type'] ?? '') === 'PKWTT') {
                                        $latestContractId = $contract->id;
                                    } else if (!$latestContractId) {
                                        $latestContractId = $contract->id;
                                    }
                                }
                            }

                            // 4. Compensation
                            if ($latestContractId && !empty($dataRequest->requested_data['compensation'])) {
                                $compData = $dataRequest->requested_data['compensation'];
                                $compData['contract_id'] = $latestContractId;
                                \App\Models\ContractCompensation::updateOrCreate(
                                    ['contract_id' => $latestContractId],
                                    $compData
                                );
                            }
                        }

                        // 5. Family
                        if (!empty($dataRequest->requested_data['family_members'])) {
                            foreach ($dataRequest->requested_data['family_members'] as $fm) {
                                $fm['worker_id'] = $worker->id;
                                \App\Models\FamilyMember::updateOrCreate(
                                    [
                                        'worker_id' => $worker->id,
                                        'name' => $fm['name']
                                    ],
                                    $fm
                                );
                            }
                        }
                    }
                } else {
                    $worker->update($dataRequest->requested_data);
                }
            }
        }

        return $worker;
    }
}
