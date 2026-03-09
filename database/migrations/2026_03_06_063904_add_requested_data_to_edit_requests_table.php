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
        Schema::table('edit_requests', function (Blueprint $table) {
            $table->json('requested_data')->nullable()->after('requested_fields');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('edit_requests', function (Blueprint $table) {
            $table->dropColumn('requested_data');
        });
    }
};
