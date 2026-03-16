<?php

namespace App\Services\Reminder\Evaluators;

use App\Enums\ReminderType;
use App\Models\Client;
use App\Models\Reminder;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Class ClientMouExpiryEvaluator
 *
 * Evaluates clients nearing their MOU end date and creates/updates
 * corresponding Reminder records of type {@see ReminderType::ClientMouExpiry}.
 *
 * The threshold (number of days before expiry to trigger) is read from
 * the setting `reminder_client_mou_expiry_days` (default: 30).
 */
class ClientMouExpiryEvaluator
{
    /**
     * Evaluate clients and generate MOU expiry reminders.
     *
     * Only clients with an `mou_end_date` within the configured threshold
     * are considered. Existing reminders for the same client are updated
     * (upserted) to avoid duplicates.
     *
     * @return int Number of reminders created or updated.
     */
    public function evaluate(): int
    {
        $days = (int) Cache::remember('setting_reminder_client_mou_expiry_days', 3600, function () {
            return Setting::where('key', 'reminder_client_mou_expiry_days')->value('value') ?? 30;
        });

        $clients = Client::whereNotNull('mou_end_date')
            ->where('mou_end_date', '>=', Carbon::now())
            ->where('mou_end_date', '<=', Carbon::now()->addDays($days))
            ->get();

        $count = 0;

        foreach ($clients as $client) {
            $daysLeft = (int) Carbon::now()->startOfDay()->diffInDays(Carbon::parse($client->mou_end_date)->startOfDay(), false);

            if ($daysLeft < 0) {
                $status = 'missed';
                $title = "MOU Client {$client->short_name} telah berakhir " . abs($daysLeft) . " hari lalu";
            } elseif ($daysLeft <= 7) {
                $status = 'critical';
                $title = $daysLeft === 0 ? "MOU Client {$client->short_name} berakhir hari ini" : "MOU Client {$client->short_name} berakhir dalam {$daysLeft} hari";
            } else {
                $status = 'pending';
                $title = "MOU Client {$client->short_name} berakhir dalam {$daysLeft} hari";
            }

            Reminder::updateOrCreate(
                [
                    'type'         => ReminderType::ClientMouExpiry,
                    'related_type' => Client::class,
                    'related_id'   => $client->id,
                ],
                [
                    'title'        => $title,
                    'message'      => "Client: {$client->full_name}",
                    'remind_at'    => now(),
                    'deadline_at'  => clone Carbon::parse($client->mou_end_date),
                    'status'       => $status,
                    'dismissed_at' => null, // re-activate if previously dismissed
                ]
            );

            $count++;
        }

        return $count;
    }
}
