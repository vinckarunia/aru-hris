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
        Schema::table('contracts', function (Blueprint $table) {
            $table->timestamp('hardcopy_received_at')->nullable()->after('file_path');
            $table->unsignedBigInteger('hardcopy_received_by')->nullable()->after('hardcopy_received_at');
            $table->foreign('hardcopy_received_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropForeign(['hardcopy_received_by']);
            $table->dropColumn(['hardcopy_received_at', 'hardcopy_received_by']);
        });
    }
};
