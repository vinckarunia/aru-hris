<?php

namespace App\Services\Reminder\Channels;

use App\Contracts\ReminderChannelInterface;
use App\Models\Reminder;
use Illuminate\Support\Facades\Log;

/**
 * Class DashboardChannel
 *
 * The built-in "no-op" delivery channel for dashboard reminders.
 *
 * Since reminders are already persisted to the database by the evaluators,
 * this channel simply logs the event. The dashboard reads reminders directly
 * from the database (via a Redis-cached query in DashboardController).
 *
 * This class exists as the default channel implementation and as a reference
 * for implementors of {@see ReminderChannelInterface}.
 */
class DashboardChannel implements ReminderChannelInterface
{
    /**
     * "Deliver" a reminder to the dashboard.
     *
     * In practice, reminders are already persisted to the DB before channels
     * are invoked. This channel logs the event for audit purposes.
     *
     * @param  Reminder  $reminder  The persisted reminder instance.
     * @return void
     */
    public function send(Reminder $reminder): void
    {
        Log::debug("[ReminderSystem] Dashboard reminder recorded", [
            'id'    => $reminder->id,
            'type'  => $reminder->type->value,
            'title' => $reminder->title,
        ]);
    }
}
