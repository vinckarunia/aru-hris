<?php

namespace App\Services\Reminder;

use App\Contracts\ReminderChannelInterface;
use App\Enums\ReminderType;
use App\Models\Reminder;
use App\Models\Setting;
use App\Services\Reminder\Channels\DashboardChannel;
use App\Services\Reminder\Evaluators\BpjsIncompleteEvaluator;
use App\Services\Reminder\Evaluators\ContractExpiryEvaluator;
use App\Services\Reminder\Evaluators\ClientMouExpiryEvaluator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Class ReminderService
 *
 * Central orchestrator for the reminder system. Reads enabled reminder
 * configurations from settings (cached in Redis), runs each registered
 * evaluator, and dispatches results to all registered channels.
 *
 * ---
 *
 * ## Adding a New Reminder Type
 *
 * 1. Add a new case to {@see \App\Enums\ReminderType}.
 * 2. Create a new Evaluator class in `App\Services\Reminder\Evaluators\`
 *    with a public `evaluate(): int` method.
 * 3. Register the mapping in the `$evaluators` array below.
 * 4. Add a default setting `reminder_{type}_enabled = 1` in
 *    {@see \App\Http\Controllers\SettingController::resetSystem()}.
 *
 * ## Adding a New Delivery Channel
 *
 * 1. Create a class implementing {@see \App\Contracts\ReminderChannelInterface}.
 * 2. Add it to the `$channels` array in `getChannels()` below.
 * 3. See {@see \App\Services\Reminder\Channels\EmailChannel} for a full
 *    step-by-step SMTP integration guide.
 */
class ReminderService
{
    /**
     * Redis cache TTL for the dashboard reminders summary (seconds).
     *
     * @var int
     */
    private const CACHE_TTL = 1800; // 30 minutes

    /**
     * Redis cache key for the dashboard reminders summary.
     *
     * @var string
     */
    public const CACHE_KEY = 'dashboard_reminders';

    /**
     * Map of ReminderType → Evaluator class.
     * Evaluators are resolved fresh on each run (no singleton state).
     *
     * @var array<string, class-string>
     */
    private array $evaluators = [
        ReminderType::ContractExpiry->value => ContractExpiryEvaluator::class,
        ReminderType::BpjsIncomplete->value => BpjsIncompleteEvaluator::class,
        ReminderType::ClientMouExpiry->value => ClientMouExpiryEvaluator::class,
    ];

    /**
     * Run all enabled evaluators, then dispatch results to all channels.
     * Invalidates the Redis dashboard cache after a successful run.
     *
     * @return array{evaluated: int, total_reminders: int} Summary of results.
     */
    public function evaluate(): array
    {
        $evaluated = 0;
        $total     = 0;

        foreach ($this->evaluators as $typeValue => $evaluatorClass) {
            $enabledKey = "reminder_{$typeValue}_enabled";
            $enabled    = Cache::remember("setting_{$enabledKey}", 3600, function () use ($enabledKey) {
                return Setting::where('key', $enabledKey)->value('value') ?? '1';
            });

            if ($enabled !== '1') {
                Log::info("[ReminderService] Skipping disabled reminder type: {$typeValue}");
                continue;
            }

            try {
                /** @var object $evaluator */
                $evaluator = app($evaluatorClass);
                $count     = $evaluator->evaluate();
                $total    += $count;
                $evaluated++;

                Log::info("[ReminderService] Evaluated {$typeValue}: {$count} reminders");
            } catch (\Throwable $e) {
                Log::error("[ReminderService] Evaluator {$evaluatorClass} failed: {$e->getMessage()}");
            }
        }

        // Dispatch to channels
        $freshReminders = Reminder::active()->whereNull('dismissed_at')->get();
        foreach ($this->getChannels() as $channel) {
            foreach ($freshReminders as $reminder) {
                try {
                    $channel->send($reminder);
                } catch (\Throwable $e) {
                    Log::error("[ReminderService] Channel " . get_class($channel) . " failed: {$e->getMessage()}");
                }
            }
        }

        // Invalidate dashboard cache so next request fetches fresh data
        Cache::forget(self::CACHE_KEY);

        return ['evaluated' => $evaluated, 'total_reminders' => $total];
    }

    /**
     * Build and return the dashboard summary from cache or DB.
     *
     * Returns an array keyed by reminder type value, each containing:
     * - `count`  (int)   Total active reminders of this type.
     * - `items`  (array) Top 5 most recent urgent items.
     *
     * @return array<string, array{count: int, items: array}>
     */
    public static function getDashboardSummary(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            $summary = [];

            foreach (ReminderType::cases() as $type) {
                $reminders = Reminder::active()
                    ->where('type', $type)
                    ->orderBy('remind_at', 'asc')
                    ->get();

                $summary[$type->value] = [
                    'label' => $type->label(),
                    'count' => $reminders->count(),
                    'items' => $reminders->take(5)->map(fn ($r) => [
                        'id'      => $r->id,
                        'title'   => $r->title,
                        'message' => $r->message,
                        'status'  => $r->status,
                    ])->values()->toArray(),
                ];
            }

            return $summary;
        });
    }

    /**
     * Return the list of active delivery channels.
     *
     * To add a new channel, append its instantiation here.
     * For more complex setups, resolve channels via the service container.
     *
     * @return ReminderChannelInterface[]
     */
    private function getChannels(): array
    {
        return [
            app(DashboardChannel::class),
            // app(EmailChannel::class), // Uncomment after configuring SMTP
        ];
    }
}
