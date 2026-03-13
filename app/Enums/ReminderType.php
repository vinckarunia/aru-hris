<?php

namespace App\Enums;

/**
 * Enum ReminderType
 *
 * Defines all available reminder categories in the system.
 * Each case corresponds to a specific compliance or HR check
 * that the reminder engine evaluates.
 *
 * To add a new reminder type:
 * 1. Add a new case here (e.g., `case DocumentExpiry = 'document_expiry'`).
 * 2. Create a corresponding Evaluator in `App\Services\Reminder\Evaluators\`.
 * 3. Register the evaluator in `ReminderService::$evaluators`.
 * 4. Add a setting key `reminder_{value}_enabled` to the settings seeder.
 */
enum ReminderType: string
{
    /** Worker's active contract is approaching its end date. */
    case ContractExpiry = 'contract_expiry';

    /** Worker's BPJS Kesehatan or BPJS Ketenagakerjaan number is missing. */
    case BpjsIncomplete = 'bpjs_incomplete';

    /**
     * Return a human-readable Indonesian label for the reminder type.
     *
     * @return string
     */
    public function label(): string
    {
        return match($this) {
            self::ContractExpiry  => 'Kontrak',
            self::BpjsIncomplete  => 'BPJS',
        };
    }

    /**
     * Return the settings key used to enable/disable this reminder type.
     *
     * @return string
     */
    public function enabledSettingKey(): string
    {
        return "reminder_{$this->value}_enabled";
    }
}
