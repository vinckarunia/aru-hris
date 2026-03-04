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
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')
                  ->constrained('workers')
                  ->onDelete('cascade');
            $table->foreignId('project_id')
                  ->constrained('projects')
                  ->onDelete('cascade');
            $table->foreignId('branch_id')
                  ->constrained('branches')
                  ->onDelete('cascade');
            $table->string('employee_id')->nullable();
            $table->string('position')->nullable();
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->enum('status', ['active', 'contract expired', 'resign', 'fired', 'other'])->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'employee_id']);
        });

        DB::statement('CREATE UNIQUE INDEX assignments_worker_active_unique ON assignments(worker_id) WHERE termination_date IS NULL;');
        DB::statement('ALTER TABLE assignments ADD CONSTRAINT check_termination_after_hire CHECK (termination_date IS NULL OR termination_date >= hire_date);');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS assignments_worker_active_unique;');
        DB::statement('ALTER TABLE assignments DROP CONSTRAINT IF EXISTS check_termination_after_hire;');
        Schema::dropIfExists('assignments');
    }
};
