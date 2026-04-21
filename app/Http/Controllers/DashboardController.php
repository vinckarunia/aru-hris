<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use App\Models\Client;
use App\Models\Project;
use App\Models\Contract;
use App\Models\Assignment;
use App\Models\DataRequest;
use App\Models\Document;
use App\Services\Reminder\ReminderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Class DashboardController
 * 
 * Handles the data aggregation and rendering for the HR Admin Dashboard.
 * Utilizes caching to optimize performance for heavy queries.
 */
class DashboardController extends Controller
{
    /**
     * Display the dashboard view with aggregated statistics.
     * 
     * @return Response
     */
    public function index(): Response
    {
        $cacheTtl = 60 * 15; // 15 minutes cache

        $user = auth()->user();
        $isPic = $user && $user->isPic();
        
        $picProjectIds = [];
        if ($isPic) {
            $picProjectIds = $user->pic ? $user->pic->projects()->pluck('projects.id')->toArray() : [];
        }

        // Cache key is different for PICs since data is scoped
        $cacheKey = $isPic ? "dashboard_stats_pic_{$user->id}" : 'dashboard_stats_admin';

        $dashboardData = Cache::remember($cacheKey, $cacheTtl, function () use ($isPic, $picProjectIds) {
            // FR-DASH-01: Quick Statistics
            $totalActiveWorkers = Worker::whereHas('assignments', function ($query) use ($isPic, $picProjectIds) {
                $query->where('status', 'active');
                if ($isPic) {
                    $query->whereIn('project_id', $picProjectIds);
                }
            })->count();

            $totalActiveClients = Client::whereHas('projects.assignments', function ($query) use ($isPic, $picProjectIds) {
                $query->where('status', 'active');
                if ($isPic) {
                    $query->whereIn('project_id', $picProjectIds);
                }
            })->count();

            $totalOngoingProjects = Project::whereHas('assignments', function ($query) use ($isPic, $picProjectIds) {
                $query->where('status', 'active');
            });
            if ($isPic) {
                $totalOngoingProjects->whereIn('id', $picProjectIds);
            }
            $totalOngoingProjects = $totalOngoingProjects->count();

            // Karyawan Tanpa Penempatan (Idle Workers) - Order by longest idle duration (oldest termination_date)
            // We find workers without active assignments, and join their latest assignment to get the termination date.
            // PIC DOES NOT SEE THIS
            $idleWorkers = [];
            $totalIdleWorkers = 0;
            if (!$isPic) {
                $totalIdleWorkers = Worker::whereDoesntHave('assignments', function ($query) {
                    $query->where('status', 'active');
                })->whereHas('assignments')->count();

                $idleWorkersQuery = Worker::whereDoesntHave('assignments', function ($query) {
                    $query->where('status', 'active');
                })
                ->whereHas('assignments')
                ->with(['assignments' => function ($query) {
                    $query->orderBy('termination_date', 'desc');
                }])
                ->get()
                ->sortBy(function ($worker) {
                    $latestAssignment = $worker->assignments->first();
                    return $latestAssignment ? Carbon::parse($latestAssignment->termination_date)->timestamp : 0;
                })
                ->take(10)
                ->values();
                $idleWorkers = $idleWorkersQuery->toArray(); // Ensure array structure matches expectations
            }

            // FR-DASH-03: Charts
            // Worker Distribution by Client (Pie Chart) - Admins only
            $workerDistribution = [];
            if (!$isPic) {
                $workerDistribution = DB::table('assignments')
                    ->join('projects', 'assignments.project_id', '=', 'projects.id')
                    ->join('clients', 'projects.client_id', '=', 'clients.id')
                    ->where('assignments.status', 'active')
                    ->select('clients.short_name as name', DB::raw('count(assignments.id) as value'))
                    ->groupBy('clients.short_name')
                    ->get()
                    ->toArray();
            }

            // Employment Status Demographics (Bar Chart)
            // Group by pkwt_type or contract_type for active assignments
            $demographicsQuery = DB::table('contracts')
                ->join('assignments', 'contracts.assignment_id', '=', 'assignments.id')
                ->where('assignments.status', 'active');
            
            if ($isPic) {
                $demographicsQuery->whereIn('assignments.project_id', $picProjectIds);
            }

            $employmentDemographics = $demographicsQuery
                ->select(DB::raw('COALESCE(contracts.pkwt_type, contracts.contract_type) as status'), DB::raw('count(contracts.id) as count'))
                ->groupBy(DB::raw('COALESCE(contracts.pkwt_type, contracts.contract_type)'))
                ->get();

            // FR-DASH-04: Data Grid (Recent Assignments)
            $recentAssignmentsQuery = Assignment::with(['worker', 'project.client', 'branch'])
                ->orderBy('hire_date', 'desc');
            
            if ($isPic) {
                $recentAssignmentsQuery->whereIn('project_id', $picProjectIds);
            }

            $recentAssignments = $recentAssignmentsQuery
                ->take(10)
                ->get();
            
            // Pending Edit Requests Count
            $pendingDataRequestsCount = 0;
            if ($isPic) {
                // PIC needs to review requests submitted by workers in their projects
                $pendingDataRequestsCount = DataRequest::where('pic_status', 'pending')
                    ->whereIn('project_id', $picProjectIds)
                    ->count();
            } else {
                // Admins need to review requests that are either approved by PIC or bypass PIC
                $pendingDataRequestsCount = DataRequest::where('status', 'pending')
                    ->where(function ($q) {
                        $q->where('pic_status', 'approved')
                          ->orWhereNull('pic_status');
                    })
                    ->count();
            }

            // Unverified Documents (Admins only)
            $unverifiedDocuments = [];
            if (!$isPic) {
                $unverifiedDocuments = Document::with('worker')
                    ->whereNull('verified_at')
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get();
            }

            return [
                'quick_stats' => [
                    'active_workers' => $totalActiveWorkers,
                    'active_clients' => $totalActiveClients,
                    'ongoing_projects' => $totalOngoingProjects,
                    'idle_workers' => $totalIdleWorkers,
                ],
                'alerts' => [
                    'idle_workers' => $idleWorkers,
                    'pending_data_requests' => $pendingDataRequestsCount,
                    'unverified_documents' => $unverifiedDocuments,
                ],
                'charts' => [
                    'worker_distribution' => $workerDistribution,
                    'employment_demographics' => $employmentDemographics,
                ],
                'recent_assignments' => $recentAssignments,
            ];
        });

        // FR-DASH-X: Reminders Summary
        if ($isPic) {
            // PIC: scope reminders to their assigned projects
            $remindersSummary = \App\Models\Reminder::active()
                ->where(function ($q) use ($picProjectIds) {
                    $q->where(function ($sub) use ($picProjectIds) {
                        $sub->where('related_type', \App\Models\Contract::class)
                            ->whereIn('related_id', function ($sq) use ($picProjectIds) {
                                $sq->select('contracts.id')
                                   ->from('contracts')
                                   ->join('assignments', 'contracts.assignment_id', '=', 'assignments.id')
                                   ->whereIn('assignments.project_id', $picProjectIds);
                            });
                    })
                    ->orWhere(function ($sub) use ($picProjectIds) {
                        $sub->where('related_type', \App\Models\Worker::class)
                            ->whereIn('related_id', function ($sq) use ($picProjectIds) {
                                $sq->select('workers.id')
                                   ->from('workers')
                                   ->join('assignments', 'assignments.worker_id', '=', 'workers.id')
                                   ->whereIn('assignments.project_id', $picProjectIds);
                            });
                    });
                })
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();
        } else {
            $remindersSummary = ReminderService::getDashboardSummary();
        }

        return Inertia::render('Dashboard', [
            'dashboardData' => $dashboardData,
            'remindersSummary' => $remindersSummary,
        ]);
    }
}
