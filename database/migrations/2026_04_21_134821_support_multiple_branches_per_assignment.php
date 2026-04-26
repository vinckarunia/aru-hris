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
        // 1. Create the pivot table
        Schema::create('assignment_branch', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('assignments')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['assignment_id', 'branch_id']);
        });

        // 2. Migrate existing branch_id data from assignments into the pivot table
        DB::statement('INSERT INTO assignment_branch (assignment_id, branch_id, created_at, updated_at) SELECT id, branch_id, NOW(), NOW() FROM assignments WHERE branch_id IS NOT NULL');

        // 3. Drop the branch_id foreign key and column from assignments
        Schema::table('assignments', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Add branch_id back to assignments
        Schema::table('assignments', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('set null');
        });

        // 2. Try to restore the data (taking the first branch for an assignment)
        DB::statement('UPDATE assignments a JOIN (SELECT assignment_id, MIN(branch_id) as branch_id FROM assignment_branch GROUP BY assignment_id) ab ON a.id = ab.assignment_id SET a.branch_id = ab.branch_id');

        // 3. Drop the pivot table
        Schema::dropIfExists('assignment_branch');
    }
};
