<?php

use App\Jobs\ProcessReminders;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * Schedule the ProcessReminders job to run daily at midnight.
 * The job evaluates all enabled reminder rules and updates the database
 * and Redis cache accordingly.
 *
 * Adjust the frequency here as needed:
 * - ->hourly()     Run every hour
 * - ->daily()      Run once per day at midnight
 * - ->dailyAt('08:00')  Run once per day at 08:00
 */
Schedule::job(new ProcessReminders)->daily();

