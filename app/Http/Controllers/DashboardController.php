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

        $dashboardData = Cache::remember('dashboard_stats', $cacheTtl, function () {
            // FR-DASH-01: Quick Statistics
            $totalActiveWorkers = Worker::whereHas('assignments', function ($query) {
                $query->where('status', 'active');
            })->count();

            $totalActiveClients = Client::whereHas('projects.assignments', function ($query) {
                $query->where('status', 'active');
            })->count();

            $totalOngoingProjects = Project::whereHas('assignments', function ($query) {
                $query->where('status', 'active');
            })->count();

            $totalIdleWorkers = Worker::whereDoesntHave('assignments', function ($query) {
                $query->where('status', 'active');
            })->count();

            // Karyawan Tanpa Penempatan (Idle Workers) - Order by longest idle duration (oldest termination_date)
            // We find workers without active assignments, and join their latest assignment to get the termination date.
            $idleWorkers = Worker::whereDoesntHave('assignments', function ($query) {
                $query->where('status', 'active');
            })
            ->with(['assignments' => function ($query) {
                $query->orderBy('termination_date', 'desc');
            }])
            ->get()
            ->sortBy(function ($worker) {
                // Sort ascending by termination_date (oldest first means longest idle). 
                // If no assignments, treat as very old (0).
                $latestAssignment = $worker->assignments->first();
                return $latestAssignment ? Carbon::parse($latestAssignment->termination_date)->timestamp : 0;
            })
            ->take(10)
            ->values();

            // FR-DASH-03: Charts
            // Worker Distribution by Client (Pie Chart)
            $workerDistribution = DB::table('assignments')
                ->join('projects', 'assignments.project_id', '=', 'projects.id')
                ->join('clients', 'projects.client_id', '=', 'clients.id')
                ->where('assignments.status', 'active')
                ->select('clients.short_name as name', DB::raw('count(assignments.id) as value'))
                ->groupBy('clients.short_name')
                ->get();

            // Employment Status Demographics (Bar Chart)
            // Group by pkwt_type or contract_type for active assignments
            $employmentDemographics = DB::table('contracts')
                ->join('assignments', 'contracts.assignment_id', '=', 'assignments.id')
                ->where('assignments.status', 'active')
                // We use pkwt_type, if null fallback to contract_type
                ->select(DB::raw('COALESCE(contracts.pkwt_type, contracts.contract_type) as status'), DB::raw('count(contracts.id) as count'))
                ->groupBy(DB::raw('COALESCE(contracts.pkwt_type, contracts.contract_type)'))
                ->get();

            // FR-DASH-04: Data Grid (Recent Assignments)
            $recentAssignments = Assignment::with(['worker', 'project.client', 'branch'])
                ->orderBy('hire_date', 'desc')
                ->take(10)
                ->get();
            
            // Pending Edit Requests Count
            $pendingEditRequestsCount = EditRequest::where('status', 'pending')->count();

            // Unverified Documents
            $unverifiedDocuments = Document::with('worker')
                ->whereNull('verified_at')
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
        $remindersSummary = ReminderService::getDashboardSummary();

        return Inertia::render('Dashboard', [
            'dashboardData' => $dashboardData,
            'remindersSummary' => $remindersSummary,
        ]);
    }
}
