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
            $table->enum('role', ['SUPER_ADMIN','PIC','CLIENT','WORKER'])->default('WORKER')->after('password');
            $table->foreignId('client_id')->nullable()->constrained('clients')->onDelete('cascade')->after('role');
            $table->foreignId('worker_id')->nullable()->constrained('workers')->onDelete('cascade')->after('client_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropForeign(['worker_id']);
            $table->dropColumn(['role', 'client_id', 'worker_id']);
        });
    }
};
