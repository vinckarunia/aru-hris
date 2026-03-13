<?php

namespace App\Services\Reminder\Evaluators;

use App\Enums\ReminderType;
use App\Models\Contract;
use App\Models\Reminder;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Class ContractExpiryEvaluator
 *
 * Evaluates active contracts nearing their end date and creates/updates
 * corresponding Reminder records of type {@see ReminderType::ContractExpiry}.
 *
 * The threshold (number of days before expiry to trigger) is read from
 * the setting `reminder_contract_expiry_days` (default: 30).
 */
class ContractExpiryEvaluator
{
    /**
     * Evaluate all active contracts and generate expiry reminders.
     *
     * Only contracts with an `end_date` within the configured threshold
     * and belonging to an active assignment are considered.
     * Existing reminders for the same contract are updated (upserted)
     * to avoid duplicates.
     *
     * @return int Number of reminders created or updated.
     */
    public function evaluate(): int
    {
        $days = (int) Cache::remember('setting_reminder_contract_expiry_days', 3600, function () {
            return Setting::where('key', 'reminder_contract_expiry_days')->value('value') ?? 30;
        });

        $contracts = Contract::with(['assignment.worker', 'assignment.project.client'])
            ->where('end_date', '>=', Carbon::now())
            ->where('end_date', '<=', Carbon::now()->addDays($days))
            ->whereHas('assignment', fn ($q) => $q->where('status', 'active'))
            ->get();

        $count = 0;

        foreach ($contracts as $contract) {
            $worker  = $contract->assignment->worker;
            $project = $contract->assignment->project;
            $daysLeft = (int) Carbon::now()->startOfDay()->diffInDays(Carbon::parse($contract->end_date)->startOfDay(), false);

            if ($daysLeft < 0) {
                $status = 'missed';
                $title = "Kontrak {$worker->name} telah berakhir " . abs($daysLeft) . " hari lalu";
            } elseif ($daysLeft <= 7) {
                $status = 'critical';
                $title = $daysLeft === 0 ? "Kontrak {$worker->name} berakhir hari ini" : "Kontrak {$worker->name} berakhir dalam {$daysLeft} hari";
            } else {
                $status = 'pending';
                $title = "Kontrak {$worker->name} berakhir dalam {$daysLeft} hari";
            }

            $nikAru = $worker->nik_aru ?? '-';
            $clientName = $project->client->short_name ?? $project->client->name ?? '';
            $projectName = $clientName ? "{$clientName} - {$project->name}" : $project->name;

            Reminder::updateOrCreate(
                [
                    'type'         => ReminderType::ContractExpiry,
                    'related_type' => Contract::class,
                    'related_id'   => $contract->id,
                ],
                [
                    'title'        => $title,
                    'message'      => "NIK ARU: {$nikAru} | Project: {$projectName}",
                    'remind_at'    => now(),
                    'deadline_at'  => clone $contract->end_date,
                    'status'       => $status,
                    'dismissed_at' => null, // re-activate if previously dismissed
                ]
            );

            $count++;
        }

        return $count;
    }
}
