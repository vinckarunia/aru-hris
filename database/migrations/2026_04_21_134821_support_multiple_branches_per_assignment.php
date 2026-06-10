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
        DB::table('assignments')
            ->whereNotNull('branch_id')
            ->chunkById(100, function ($assignments) {
                $inserts = [];
                foreach ($assignments as $assignment) {
                    $inserts[] = [
                        'assignment_id' => $assignment->id,
                        'branch_id' => $assignment->branch_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                DB::table('assignment_branch')->insert($inserts);
            });

        // 3. Drop the branch_id foreign key and column from assignments
        if (DB::getDriverName() === 'mysql') {
            Schema::table('assignments', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            });
        }
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
        if (DB::getDriverName() === 'mysql') {
            DB::statement('UPDATE assignments a JOIN (SELECT assignment_id, MIN(branch_id) as branch_id FROM assignment_branch GROUP BY assignment_id) ab ON a.id = ab.assignment_id SET a.branch_id = ab.branch_id');
        } else {
            DB::table('assignment_branch')
                ->select('assignment_id', DB::raw('MIN(branch_id) as branch_id'))
                ->groupBy('assignment_id')
                ->chunk(100, function ($rows) {
                    foreach ($rows as $row) {
                        DB::table('assignments')
                            ->where('id', $row->assignment_id)
                            ->update(['branch_id' => $row->branch_id]);
                    }
                });
        }

        // 3. Drop the pivot table
        Schema::dropIfExists('assignment_branch');
    }
};
