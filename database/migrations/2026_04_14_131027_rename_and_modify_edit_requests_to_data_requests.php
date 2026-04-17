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
        Schema::rename('edit_requests', 'data_requests');

        Schema::table('data_requests', function (Blueprint $table) {
            $table->enum('request_type', ['new_data', 'data_change', 'status_change'])->default('data_change')->after('requested_by');
            
            // New columns for PIC two-tier approval
            $table->foreignId('pic_reviewed_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->enum('pic_status', ['pending', 'approved', 'rejected'])->default('pending')->after('pic_reviewed_by');
            $table->timestamp('pic_reviewed_at')->nullable()->after('pic_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('data_requests', function (Blueprint $table) {
            $table->dropForeign(['pic_reviewed_by']);
            $table->dropColumn(['request_type', 'pic_reviewed_by', 'pic_status', 'pic_reviewed_at']);
        });

        Schema::rename('data_requests', 'edit_requests');
    }
};
