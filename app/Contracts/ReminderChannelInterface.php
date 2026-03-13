<?php

namespace App\Contracts;

use App\Models\Reminder;

/**
 * Interface ReminderChannelInterface
 *
 * Contract for all reminder delivery channels. Any new channel (e.g., email,
 * SMS, Slack webhook) must implement this interface and be registered in the
 * application service container via `AppServiceProvider`.
 *
 * ## Adding a New Channel
 *
 * 1. Create a class in `App\Services\Reminder\Channels\`, e.g. `EmailChannel.php`.
 * 2. Implement this interface:
 *    ```php
 *    class EmailChannel implements ReminderChannelInterface {
 *        public function send(Reminder $reminder): void {
 *            // use Laravel Mail facade here
 *        }
 *    }
 *    ```
 * 3. Tag and register in `AppServiceProvider::register()`:
 *    ```php
 *    $this->app->tagged('reminder.channels'); // already auto-registered if you bind it
 *    $this->app->bind(EmailChannel::class);
 *    ```
 * 4. In `ReminderService`, add an instance of your channel to the `$channels` array
 *    or resolve them via the container tag `reminder.channels`.
 *
 * @see \App\Services\Reminder\ReminderService
 */
interface ReminderChannelInterface
{
    /**
     * Deliver the given reminder through this channel.
     *
     * @param  Reminder  $reminder  The fully-persisted reminder model instance.
     * @return void
     */
    public function send(Reminder $reminder): void;
}
