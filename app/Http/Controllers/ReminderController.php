<?php

namespace App\Http\Controllers;

use App\Enums\ReminderType;
use App\Jobs\ProcessReminders;
use App\Models\Reminder;
use App\Services\Reminder\ReminderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Class ReminderController
 *
 * Handles the dedicated Reminders management page, including listing,
 * filtering, sorting, and dismissing reminder records.
 * Access is restricted to SUPER_ADMIN and ADMIN_ARU roles.
 */
class ReminderController extends Controller
{
    /**
     * Display the paginated list of reminders with optional search, filter, and sort.
     *
     * @param  Request  $request
     * @return Response
     */
    public function index(Request $request): Response
    {
        $query = Reminder::query();

        // Filter by tab (active = not dismissed, dismissed)
        $tab = $request->input('tab', 'active');
        if ($tab === 'dismissed') {
            $query->dismissed();
        } else {
            $query->active();
        }

        // Filter by status (pending, critical, missed)
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        // Search by title/message
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('message', 'ilike', "%{$search}%");
            });
        }

        // Sort
        $sortBy  = $request->input('sort_by', 'deadline_at');
        $sortDir = $request->input('sort_dir', 'asc');
        $allowedSorts = ['deadline_at', 'title', 'type', 'status', 'created_at', 'dismissed_at'];

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $reminders = $query->paginate(20)->withQueryString();

        // Build type options for filter dropdown
        $typeOptions = array_map(fn (ReminderType $t) => [
            'value' => $t->value,
            'label' => $t->label(),
        ], ReminderType::cases());

        return Inertia::render('Reminder/Index', [
            'reminders'   => $reminders,
            'filters'     => [
                'search'   => $request->input('search', ''),
                'type'     => $request->input('type', ''),
                'status'   => $request->input('status', ''),
                'tab'      => $tab,
                'sort_by'  => $sortBy,
                'sort_dir' => $sortDir,
            ],
            'typeOptions' => $typeOptions,
        ]);
    }

    /**
     * Dismiss a reminder by setting its `dismissed_at` timestamp.
     * Also invalidates the dashboard reminder Redis cache.
     *
     * @param  Reminder  $reminder
     * @return \Illuminate\Http\RedirectResponse
     */
    public function dismiss(Reminder $reminder)
    {
        $reminder->update(['dismissed_at' => now()]);

        // Invalidate the dashboard cache so the summary reflects the dismissal
        Cache::forget(ReminderService::CACHE_KEY);

        return back()->with('success', 'Reminder berhasil di-dismiss.');
    }

    /**
     * Restore (un-dismiss) a previously dismissed reminder.
     *
     * @param  Reminder  $reminder
     * @return \Illuminate\Http\RedirectResponse
     */
    public function restore(Reminder $reminder)
    {
        $reminder->update(['dismissed_at' => null]);

        Cache::forget(ReminderService::CACHE_KEY);

        return back()->with('success', 'Reminder berhasil dipulihkan.');
    }

    /**
     * Manually trigger the reminder evaluation process.
     * Equivalent to `php artisan reminders:process`.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function process(Request $request)
    {
        ProcessReminders::dispatchSync();
        Cache::forget(ReminderService::CACHE_KEY);

        return back()->with('success', 'Proses kalkulasi ulang reminder berhasil diselesaikan.');
    }
}
