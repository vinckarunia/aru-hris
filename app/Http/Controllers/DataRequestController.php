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
        $search = $request->input('search');
        $projectId = $request->input('project_id');
        $requesterId = $request->input('requester_id');

        $query = DataRequest::with(['worker', 'project:id,name', 'requester:id,name,role', 'reviewer:id,name', 'picReviewer:id,name'])
                    ->where('request_type', $type);

        if ($user->isWorker()) {
            $query->where('worker_id', $user->worker_id);
        } elseif ($user->isPic()) {
            // Get project_ids handled by this PIC
            $picProjectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            $query->whereIn('project_id', $picProjectIds);
        }

        if ($search) {
            $query->whereHas('worker', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('nik_aru', 'like', "%{$search}%");
            });
        }

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        if ($requesterId && $user->isAdminOrAbove()) {
            $query->where('requested_by', $requesterId);
        }

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

        $perPage = min((int) $request->input('per_page', 10), 100);
        $dataRequests = $query->paginate($perPage)->withQueryString();

        // Post-process: resolve FK IDs to human-readable names format requires iteration over Collection rather than Builder collection
        // However, using tap or through over pagination allows this
        $dataRequests->getCollection()->transform(function ($dr) {
            $data = $dr->requested_data;
            if (!is_array($data)) return $dr;

            $resolved = [];

            if (isset($data['project_id'])) {
                $p = \App\Models\Project::find($data['project_id']);
                if ($p) $resolved['project_id'] = $p->name;
            }
            if (isset($data['branch_ids']) && is_array($data['branch_ids'])) {
                $branches = \App\Models\Branch::whereIn('id', $data['branch_ids'])->get();
                if ($branches->isNotEmpty()) {
                    $resolved['branch_ids'] = $branches->pluck('name')->implode(', ');
                }
            }
            if (isset($data['worker_id'])) {
                $w = \App\Models\Worker::find($data['worker_id']);
                if ($w) $resolved['worker_id'] = $w->name;
            }
            if (isset($data['assignment_id'])) {
                $a = \App\Models\Assignment::with(['project', 'worker'])->find($data['assignment_id']);
                if ($a) $resolved['assignment_id'] = ($a->worker->name ?? '') . ' — ' . ($a->project->name ?? '');
            }
            if (isset($data['contract_id'])) {
                $c = \App\Models\Contract::with(['assignment.project', 'assignment.worker'])->find($data['contract_id']);
                if ($c) $resolved['contract_id'] = ($c->assignment->worker->name ?? '') . ' — ' . ($c->assignment->project->name ?? '') . ' (Kontrak #' . $c->id . ')';
            }

            if (!empty($resolved)) {
                $data['_resolved_labels'] = $resolved;
                $dr->requested_data = $data;
            }
            return $dr;
        });

        $filterOptions = [];
        if ($user->isAdminOrAbove()) {
            $filterOptions['projects'] = Project::orderBy('name')->get(['id', 'name']);
            // Distinct requesters from data_requests table
            $requesterIds = DataRequest::distinct()->pluck('requested_by')->filter();
            $filterOptions['requesters'] = \App\Models\User::whereIn('id', $requesterIds)->orderBy('name')->get(['id', 'name']);
        } elseif ($user->isPic()) {
            $picProjectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
            $filterOptions['projects'] = Project::whereIn('id', $picProjectIds)->orderBy('name')->get(['id', 'name']);
        }

        return Inertia::render('DataRequest/Index', [
            'dataRequests' => $dataRequests,
            'filterOptions' => $filterOptions,
            'filters' => [
                'sort' => $sort,
                'direction' => $direction,
                'status' => $status,
                'type' => $type,
                'search' => $search,
                'project_id' => $projectId,
                'requester_id' => $requesterId,
                'per_page' => $perPage,
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

        $actionLog = $validated['status'] === 'approved' ? 'approve' : 'reject';
        $statusText = $validated['status'] === 'approved' ? 'menyetujui' : 'menolak';
        $workerName = \App\Models\Worker::find($dataRequest->worker_id)?->name ?? 'Unknown Worker';
        \App\Models\AuditLog::log($actionLog, 'data_request', ucfirst($statusText) . " data request #{$dataRequest->id} untuk karyawan: {$workerName}", ['data_request_id' => $dataRequest->id, 'type' => $dataRequest->request_type]);

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
                    'has_contract' => $latestAssignment ? $latestAssignment->contracts()->exists() : false,
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

                $actionLog = $validated['status'] === 'approved' ? 'approve' : 'reject';
                $statusText = $validated['status'] === 'approved' ? 'menyetujui' : 'menolak';
                $workerName = \App\Models\Worker::find($dataRequest->worker_id)?->name ?? 'Unknown Worker';
                \App\Models\AuditLog::log($actionLog, 'data_request', ucfirst($statusText) . " data request #{$dataRequest->id} untuk karyawan: {$workerName} (Bulk)", ['data_request_id' => $dataRequest->id, 'type' => $dataRequest->request_type]);

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
                            'has_contract' => $latestAssignment ? $latestAssignment->contracts()->exists() : false,
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
                        'position' => $dataRequest->requested_data['position'] ?? null,
                        'hire_date' => now(),
                        'status' => 'active',
                    ], $assignmentFillable);

                    $assignment = \App\Models\Assignment::create($assignmentFillable);
                    
                    if (!empty($dataRequest->requested_data['branch_ids'])) {
                        $assignment->branches()->sync($dataRequest->requested_data['branch_ids']);
                    } else if ($project->branches->isNotEmpty()) {
                        $assignment->branches()->sync([$project->branches->first()->id]);
                    }

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

                    // Handle _contract sub-key from PIC bundled worker+contract form
                    if (!empty($dataRequest->requested_data['_contract'])) {
                        $cData = $dataRequest->requested_data['_contract'];
                        $contractFillable = array_intersect_key($cData, array_flip((new \App\Models\Contract)->getFillable()));
                        $contractFillable['assignment_id'] = $assignment->id;
                        $contract = \App\Models\Contract::create($contractFillable);

                        $compFillable = array_intersect_key($cData, array_flip((new \App\Models\ContractCompensation)->getFillable()));
                        $compFillable['contract_id'] = $contract->id;
                        \App\Models\ContractCompensation::create($compFillable);
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
                    } else if ($action === 'create_assignment') {
                        $createFields = array_diff_key($dataRequest->requested_data, ['_action' => '', '_contract' => '']);
                        $assignmentFillable = array_intersect_key($createFields, array_flip((new \App\Models\Assignment)->getFillable()));
                        $assignment = \App\Models\Assignment::create($assignmentFillable);

                        if (!empty($dataRequest->requested_data['branch_ids'])) {
                            $assignment->branches()->sync($dataRequest->requested_data['branch_ids']);
                        }

                        if (is_null($assignmentFillable['termination_date'] ?? null)) {
                            $project = \App\Models\Project::find($assignmentFillable['project_id']);
                            if ($project && empty($worker->nik_aru)) {
                                $newNik = (new AssignmentController)->generateNikForProject($project);
                                $worker->update(['nik_aru' => $newNik]);
                            }
                        }

                        // Handle bundled contract creation
                        if (isset($dataRequest->requested_data['_contract'])) {
                            $contractData = $dataRequest->requested_data['_contract'];
                            $contractFillable = array_intersect_key($contractData, array_flip((new \App\Models\Contract)->getFillable()));
                            $contractFillable['assignment_id'] = $assignment->id;
                            $contract = \App\Models\Contract::create($contractFillable);

                            $compFillable = array_intersect_key($contractData, array_flip((new \App\Models\ContractCompensation)->getFillable()));
                            $compFillable['contract_id'] = $contract->id;
                            \App\Models\ContractCompensation::create($compFillable);
                        }
                    } else if ($action === 'delete_assignment') {
                        $assignment = \App\Models\Assignment::find($dataRequest->requested_data['assignment_id']);
                        if ($assignment) {
                            $assignment->delete();
                            $worker->update(['nik_aru' => null]);
                        }
                    } else if ($action === 'create_contract') {
                        $createFields = array_diff_key($dataRequest->requested_data, ['_action' => '']);
                        $contractFillable = array_intersect_key($createFields, array_flip((new \App\Models\Contract)->getFillable()));
                        $contract = \App\Models\Contract::create($contractFillable);

                        $compFillable = array_intersect_key($createFields, array_flip((new \App\Models\ContractCompensation)->getFillable()));
                        $compFillable['contract_id'] = $contract->id;
                        \App\Models\ContractCompensation::create($compFillable);
                    } else if ($action === 'update_contract') {
                        $contract = \App\Models\Contract::with('compensation')->find($dataRequest->requested_data['contract_id']);
                        if ($contract) {
                            $updateFields = array_diff_key($dataRequest->requested_data, ['_action' => '', 'contract_id' => '']);
                            
                            $contractFillable = array_intersect_key($updateFields, array_flip((new \App\Models\Contract)->getFillable()));
                            $contract->update($contractFillable);

                            $compFillable = array_intersect_key($updateFields, array_flip((new \App\Models\ContractCompensation)->getFillable()));
                            if ($contract->compensation) {
                                $contract->compensation->update($compFillable);
                            } else if (!empty($compFillable)) {
                                $compFillable['contract_id'] = $contract->id;
                                \App\Models\ContractCompensation::create($compFillable);
                            }
                        }
                    } else if ($action === 'delete_contract') {
                        $contract = \App\Models\Contract::find($dataRequest->requested_data['contract_id']);
                        if ($contract) {
                            $contract->delete();
                        }
                    } else if ($action === 'bulk_import_update_worker_only') {
                        // Data-only update: only update worker profile fields, no assignment/contract/compensation changes
                        $workerFillable = array_intersect_key($dataRequest->requested_data, array_flip((new \App\Models\Worker)->getFillable()));
                        $updateData = array_filter($workerFillable, fn($v) => $v !== null && $v !== '');
                        unset($updateData['ktp_number']);
                        $worker->update($updateData);
                    } else if ($action === 'bulk_import_update_worker') {
                        // 1. Update Worker (ignore nulls & ktp_number)
                        $workerFillable = array_intersect_key($dataRequest->requested_data, array_flip((new \App\Models\Worker)->getFillable()));
                        $updateData = array_filter($workerFillable, fn($v) => $v !== null && $v !== '');
                        unset($updateData['ktp_number']);
                        $worker->update($updateData);

                        // 2. Update/Create Assignment
                        $assignmentFillable = array_intersect_key($dataRequest->requested_data, array_flip((new \App\Models\Assignment)->getFillable()));
                        $assignmentUpdateData = array_filter($assignmentFillable, fn($v) => $v !== null && $v !== '');
                        if (!empty($assignmentUpdateData)) {
                            $existingAssignment = \App\Models\Assignment::where('worker_id', $worker->id)->first();
                            if ($existingAssignment) {
                                $existingAssignment->update($assignmentUpdateData);
                                $assignment = $existingAssignment;
                            } else {
                                $assignmentUpdateData['worker_id'] = $worker->id;
                                $assignment = \App\Models\Assignment::create($assignmentUpdateData);
                                
                                $project = \App\Models\Project::find($assignmentFillable['project_id'] ?? null);
                                if ($project && empty($worker->nik_aru)) {
                                    $newNik = (new AssignmentController)->generateNikForProject($project);
                                    $worker->update(['nik_aru' => $newNik]);
                                }
                            }
                            
                            if (!empty($dataRequest->requested_data['branch_ids'])) {
                                $assignment->branches()->sync($dataRequest->requested_data['branch_ids']);
                            }

                            // 3. Contracts
                            $latestContractId = null;
                            if (!empty($dataRequest->requested_data['contracts'])) {
                                foreach ($dataRequest->requested_data['contracts'] as $c) {
                                    $contractUpdateData = array_filter($c, fn($v) => $v !== null && $v !== '');
                                    $contractUpdateData['assignment_id'] = $assignment->id;
                                    $contract = \App\Models\Contract::updateOrCreate(
                                        [
                                            'assignment_id' => $assignment->id,
                                            'contract_type' => $c['contract_type'] ?? 'Kontrak',
                                            'pkwt_type' => $c['pkwt_type'] ?? null,
                                            'pkwt_number' => $c['pkwt_number'] ?? null,
                                        ],
                                        $contractUpdateData
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
                                $compUpdateData = array_filter($compData, fn($v) => $v !== null && $v !== '');
                                $compUpdateData['contract_id'] = $latestContractId;
                                \App\Models\ContractCompensation::updateOrCreate(
                                    ['contract_id' => $latestContractId],
                                    $compUpdateData
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

    /**
     * Send contract approval notification email to worker with CC to PIC.
     *
     * Wrapped in try/catch so email failures never block the approval flow.
     * Logs the email attempt (success or failure) to AuditLog.
     *
     * @param Worker     $worker     The worker the contract belongs to.
     * @param \App\Models\Contract   $contract   The approved contract.
     * @param \App\Models\Assignment $assignment The related assignment.
     * @return void
     */
    private function sendContractApprovalEmail($worker, $contract, $assignment): void
    {
        try {
            $assignment->load('project');

            // Determine worker's email address
            $recipientEmail = ($worker->user->email ?? null) ?: ($worker->email ?? null);
            if (!$recipientEmail) {
                \App\Models\AuditLog::log('email', 'contract', "Gagal mengirim email kontrak: karyawan {$worker->name} tidak memiliki email", [
                    'contract_id' => $contract->id,
                    'worker_name' => $worker->name,
                    'status' => 'skipped_no_email',
                ]);
                return;
            }

            // Find PIC email(s) for the project
            $ccEmails = [];
            if ($assignment->project_id) {
                $picUsers = \App\Models\Pic::whereHas('projects', function ($q) use ($assignment) {
                    $q->where('projects.id', $assignment->project_id);
                })->with('user')->get();

                foreach ($picUsers as $pic) {
                    if ($pic->user && $pic->user->email) {
                        $ccEmails[] = $pic->user->email;
                    }
                }
            }

            $mail = \Illuminate\Support\Facades\Mail::to($recipientEmail);
            if (!empty($ccEmails)) {
                $mail->cc($ccEmails);
            }

            $mail->send(new \App\Mail\ContractApprovedMail($worker, $contract, $assignment));

            \App\Models\AuditLog::log('email', 'contract', "Email pemberitahuan kontrak berhasil dikirim ke karyawan: {$worker->name}", [
                'contract_id' => $contract->id,
                'worker_name' => $worker->name,
                'recipient' => $recipientEmail,
                'cc' => $ccEmails,
                'subject' => 'Pemberitahuan Kontrak Kerja — PT. Alfa Reka Usaha',
                'status' => 'sent',
            ]);
        } catch (\Exception $e) {
            \App\Models\AuditLog::log('email', 'contract', "Gagal mengirim email kontrak untuk karyawan: {$worker->name} — {$e->getMessage()}", [
                'contract_id' => $contract->id,
                'worker_name' => $worker->name,
                'error' => $e->getMessage(),
                'status' => 'failed',
            ]);
        }
    }
}
