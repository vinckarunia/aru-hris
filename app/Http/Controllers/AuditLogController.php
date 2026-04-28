<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Class AuditLogController
 *
 * Provides a paginated, filterable view of all audit log entries.
 * Accessible only by SUPER_ADMIN and ADMIN_ARU roles.
 */
class AuditLogController extends Controller
{
    /**
     * Display the audit log index page with search, filter, and pagination.
     *
     * @param Request $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $query = AuditLog::with('user')
            ->orderByDesc('created_at');

        // Filter by module tab
        if ($request->filled('module') && $request->module !== 'all') {
            $query->where('module', $request->module);
        }

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        // Search by description or user name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Date range filter
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->paginate(25)->withQueryString();

        return Inertia::render('AuditLog/Index', [
            'logs' => $logs,
            'filters' => [
                'search' => $request->search ?? '',
                'module' => $request->module ?? 'all',
                'action' => $request->action ?? '',
                'date_from' => $request->date_from ?? '',
                'date_to' => $request->date_to ?? '',
            ],
        ]);
    }
}
