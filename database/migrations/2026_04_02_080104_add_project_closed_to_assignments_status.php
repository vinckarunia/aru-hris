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
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('active', 'contract expired', 'resign', 'fired', 'other', 'project closed') NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('active', 'contract expired', 'resign', 'fired', 'other') NULL");
        }
    }
};
