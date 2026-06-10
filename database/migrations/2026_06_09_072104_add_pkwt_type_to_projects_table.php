<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('projects', 'pkwt_type')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->string('pkwt_type', 50)->nullable()->default('all')->after('name');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('projects', 'pkwt_type')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->dropColumn('pkwt_type');
            });
        }
    }
};
