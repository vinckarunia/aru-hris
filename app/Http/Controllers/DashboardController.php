<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use App\Models\Client;
use App\Models\Project;
use App\Models\Contract;
use App\Models\Assignment;
use App\Models\EditRequest;
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
                })->count();

                $idleWorkersQuery = Worker::whereDoesntHave('assignments', function ($query) {
                    $query->where('status', 'active');
                })
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
            
            // Pending Edit Requests Count - Admins only
            $pendingEditRequestsCount = 0;
            if (!$isPic) {
                $pendingEditRequestsCount = EditRequest::where('status', 'pending')->count();
            }

            // Unverified Documents (For PIC: only workers within their active projects)
            $unverifiedDocsQuery = Document::with('worker')->whereNull('verified_at');
            
            if ($isPic) {
                $unverifiedDocsQuery->whereHas('worker.assignments', function ($q) use ($picProjectIds) {
                    $q->whereIn('status', ['active', 'probation', 'extended'])
                      ->whereIn('project_id', $picProjectIds);
                });
            }

            $unverifiedDocuments = $unverifiedDocsQuery
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();

            return [
                'quick_stats' => [
                    'active_workers' => $totalActiveWorkers,
                    'active_clients' => $totalActiveClients,
                    'ongoing_projects' => $totalOngoingProjects,
                    'idle_workers' => $totalIdleWorkers,
                ],
                'alerts' => [
                    'idle_workers' => $idleWorkers,
                    'pending_edit_requests' => $pendingEditRequestsCount,
                    'unverified_documents' => $unverifiedDocuments,
                ],
                'charts' => [
                    'worker_distribution' => $workerDistribution,
                    'employment_demographics' => $employmentDemographics,
                ],
                'recent_assignments' => $recentAssignments,
            ];
        });

        // FR-DASH-X: Reminders Summary (from Cache)
        // PICs usually don't see system-wide reminders unless we scope them, 
        // but for now we leave it empty or scope as needed.
        $remindersSummary = $isPic ? [] : ReminderService::getDashboardSummary();

        return Inertia::render('Dashboard', [
            'dashboardData' => $dashboardData,
            'remindersSummary' => $remindersSummary,
        ]);
    }
}
