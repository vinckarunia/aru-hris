<?php

namespace App\Console\Commands;

use App\Jobs\ProcessReminders;
use Illuminate\Console\Command;

/**
 * Class ProcessRemindersCommand
 *
 * Artisan command to manually trigger the reminder evaluation pipeline.
 *
 * Usage:
 * ```bash
 * php artisan reminders:process
 * ```
 *
 * This will synchronously dispatch the {@see ProcessReminders} job and
 * run all registered evaluators, then update the Redis cache.
 */
class ProcessRemindersCommand extends Command
{
    /** @var string */
    protected $signature = 'reminders:process';

    /** @var string */
    protected $description = 'Evaluate all reminder rules and update the reminders table and Redis cache.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        $this->info('Processing reminders...');

        ProcessReminders::dispatchSync();

        $this->info('Done. Reminders evaluated and cache updated.');

        return self::SUCCESS;
    }
}
