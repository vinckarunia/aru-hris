<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds extensibility fields to the reminders table:
 * - type:         Machine-readable reminder category (e.g. 'contract_expiry').
 * - title:        Human-readable short description of the reminder.
 * - message:      Optional longer description or context.
 * - dismissed_at: When the reminder was acknowledged/dismissed by an admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reminders', function (Blueprint $table) {
            $table->string('type')->after('id')->default('general');
            $table->string('title')->after('type');
            $table->text('message')->nullable()->after('title');
            $table->timestamp('dismissed_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('reminders', function (Blueprint $table) {
            $table->dropColumn(['type', 'title', 'message', 'dismissed_at']);
        });
    }
};
