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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['SUPER_ADMIN', 'ADMIN_ARU', 'PIC', 'WORKER'])->default('ADMIN_ARU')->after('password');
            $table->foreignId('worker_id')->nullable()->constrained('workers')->nullOnDelete()->after('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['worker_id']);
            $table->dropColumn(['role', 'worker_id']);
        });
    }
};
