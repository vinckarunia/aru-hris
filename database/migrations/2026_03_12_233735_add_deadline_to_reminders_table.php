<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the enum check constraint from postgres
        DB::statement('ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_status_check');

        Schema::table('reminders', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
            $table->date('deadline_at')->nullable()->after('remind_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reminders', function (Blueprint $table) {
            $table->dropColumn('deadline_at');
        });
    }
};
