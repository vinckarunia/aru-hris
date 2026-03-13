<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class ReminderSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Default Reminder Settings
        Setting::updateOrCreate(
            ['key' => 'reminder_contract_expiry_enabled'],
            ['value' => '1', 'group' => 'reminders']
        );

        Setting::updateOrCreate(
            ['key' => 'reminder_contract_expiry_days'],
            ['value' => '30', 'group' => 'reminders']
        );

        Setting::updateOrCreate(
            ['key' => 'reminder_bpjs_incomplete_enabled'],
            ['value' => '1', 'group' => 'reminders']
        );
    }
}
