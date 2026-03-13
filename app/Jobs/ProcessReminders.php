<?php

namespace App\Jobs;

use App\Services\Reminder\ReminderService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Class ProcessReminders
 *
 * A queueable job that triggers the reminder evaluation pipeline.
 * Scheduled to run daily via {@see \Illuminate\Console\Scheduling\Schedule}.
 *
 * ## Manual Trigger
 * ```bash
 * php artisan reminders:process
 * ```
 *
 * ## Schedule
 * Configured in `routes/console.php` to run daily at midnight (server time).
 * Adjust the schedule there if a different frequency is needed.
 *
 * ## Queue
 * Uses the default queue connection (`redis` in production).
 * Run a worker with: `php artisan queue:work`
 */
class ProcessReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     *
     * @param  ReminderService  $reminderService
     * @return void
     */
    public function handle(ReminderService $reminderService): void
    {
        Log::info('[ProcessReminders] Starting reminder evaluation...');

        $result = $reminderService->evaluate();

        Log::info('[ProcessReminders] Completed.', $result);
    }
}
