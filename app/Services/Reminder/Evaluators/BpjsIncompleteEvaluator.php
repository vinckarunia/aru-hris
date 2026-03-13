<?php

namespace App\Services\Reminder\Evaluators;

use App\Enums\ReminderType;
use App\Models\Reminder;
use App\Models\Worker;

/**
 * Class BpjsIncompleteEvaluator
 *
 * Evaluates workers with active assignments whose BPJS registration
 * numbers are missing, and creates Reminder records of type
 * {@see ReminderType::BpjsIncomplete}.
 *
 * Per business rule: both `bpjs_kesehatan` and `bpjs_ketenagakerjaan`
 * must be present for a worker with an active assignment. A reminder
 * is created if either (or both) are null.
 */
class BpjsIncompleteEvaluator
{
    /**
     * Evaluate all active workers for missing BPJS numbers.
     *
     * Workers without an active assignment are excluded. Existing reminders
     * for the same worker are upserted to avoid duplicates.
     *
     * @return int Number of reminders created or updated.
     */
    public function evaluate(): int
    {
        // Get workers with active assignment
        $workers = Worker::with(['assignments' => function($q) {
                $q->where('status', 'active')->with('project.client');
            }])
            ->whereHas('assignments', fn ($q) => $q->where('status', 'active'))
            ->where(function ($q) {
                $q->whereNull('bpjs_kesehatan')
                  ->orWhereNull('bpjs_ketenagakerjaan');
            })
            ->get();

        $count = 0;

        foreach ($workers as $worker) {
            $missing = [];
            if (! $worker->bpjs_kesehatan) {
                $missing[] = 'BPJS Kesehatan';
            }
            if (! $worker->bpjs_ketenagakerjaan) {
                $missing[] = 'BPJS Ketenagakerjaan';
            }

            $missingStr = implode(' & ', $missing);
            $activeAssignment = $worker->assignments->first();
            $contractStartDate = $activeAssignment && $activeAssignment->contracts->isNotEmpty() ? $activeAssignment->contracts->first()->start_date : null;
            
            $deadline = $activeAssignment ? ($activeAssignment->hire_date ?? $contractStartDate ?? now()) : now();
            $daysLeft = (int) \Carbon\Carbon::now()->startOfDay()->diffInDays(\Carbon\Carbon::parse($deadline)->startOfDay(), false);

            if ($daysLeft < 0) {
                $status = 'missed';
                $title = "{$missingStr} {$worker->name} belum terdaftar.";
            } elseif ($daysLeft <= 7) {
                $status = 'critical';
                $title = ($daysLeft === 0 ? "{$missingStr} {$worker->name} belum terdaftar. Segera daftarkan sebelum besok." : "{$missingStr} {$worker->name} belum terdaftar. Segera daftarkan sebelum ".\Carbon\Carbon::parse($deadline)->format('d M Y'));
            } else {
                $status = 'pending';
                $title = "{$missingStr} {$worker->name} belum terdaftar. Segera daftarkan sebelum ".\Carbon\Carbon::parse($deadline)->format('d M Y');
            }

            $nikAru = $worker->nik_aru ?? '-';
            $project = $activeAssignment ? $activeAssignment->project : null;
            $projectName = '-';
            if ($project) {
                $clientName = $project->client->short_name ?? $project->client->name ?? '';
                $projectName = $clientName ? "{$clientName} - {$project->name}" : $project->name;
            }

            Reminder::updateOrCreate(
                [
                    'type'         => ReminderType::BpjsIncomplete,
                    'related_type' => Worker::class,
                    'related_id'   => $worker->id,
                ],
                [
                    'title'        => $title,
                    'message'      => "NIK ARU: {$nikAru} | Project: {$projectName}",
                    'remind_at'    => now(),
                    'deadline_at'  => \Carbon\Carbon::parse($deadline),
                    'status'       => $status,
                    'dismissed_at' => null,
                ]
            );

            $count++;
        }

        return $count;
    }
}
