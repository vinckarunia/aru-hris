<?php

namespace App\Services\Reminder\Channels;

use App\Contracts\ReminderChannelInterface;
use App\Models\Reminder;

/**
 * Class EmailChannel
 *
 * **STUB** — Email delivery channel via SMTP.
 *
 * This class is intentionally left as a stub to guide future developers
 * in integrating email notifications with the reminder system.
 *
 * ---
 *
 * ## Integration Guide: Email via SMTP
 *
 * ### Step 1 — Configure SMTP in `.env`
 * ```env
 * MAIL_MAILER=smtp
 * MAIL_HOST=smtp.example.com
 * MAIL_PORT=587
 * MAIL_USERNAME=your-user@example.com
 * MAIL_PASSWORD=your-password
 * MAIL_ENCRYPTION=tls
 * MAIL_FROM_ADDRESS=hris@example.com
 * MAIL_FROM_NAME="${APP_NAME}"
 * ```
 *
 * ### Step 2 — Create a Mailable
 * ```bash
 * php artisan make:mail ReminderMail --markdown=emails.reminder
 * ```
 * In `ReminderMail`, accept a `Reminder $reminder` in the constructor
 * and pass it to the markdown template.
 *
 * ### Step 3 — Implement `send()` below
 * ```php
 * use Illuminate\Support\Facades\Mail;
 * use App\Mail\ReminderMail;
 *
 * public function send(Reminder $reminder): void {
 *     $recipients = config('reminder.email_recipients', []);
 *     // Or resolve recipients dynamically (e.g., all ADMIN_ARU users):
 *     // $recipients = User::where('role', 'ADMIN_ARU')->pluck('email')->toArray();
 *
 *     Mail::to($recipients)->queue(new ReminderMail($reminder));
 * }
 * ```
 *
 * ### Step 4 — Register the Channel
 * In `App\Providers\AppServiceProvider::register()`:
 * ```php
 * $this->app->tag([EmailChannel::class], 'reminder.channels');
 * ```
 * Then resolve it in `ReminderService`:
 * ```php
 * protected array $channels = [DashboardChannel::class, EmailChannel::class];
 * ```
 *
 * ### Step 5 — Queue Worker
 * Ensure a queue worker is running (`QUEUE_CONNECTION=redis` already set):
 * ```bash
 * php artisan queue:work
 * ```
 *
 * ---
 *
 * @see \App\Contracts\ReminderChannelInterface
 * @see \App\Services\Reminder\ReminderService
 */
class EmailChannel implements ReminderChannelInterface
{
    /**
     * Send the reminder via email.
     *
     * Replace this stub with a real implementation following the guide above.
     *
     * @param  Reminder  $reminder
     * @return void
     */
    public function send(Reminder $reminder): void
    {
        // STUB: Implement email delivery here.
        // See the class-level PHPDoc for a step-by-step integration guide.
    }
}
