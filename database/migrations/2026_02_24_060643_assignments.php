<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Note: The PostgreSQL partial index (`CREATE UNIQUE INDEX ... WHERE termination_date IS NULL`)
     * that enforced only one active assignment per worker has been removed, as MySQL does not
     * support partial indexes. This uniqueness constraint is now enforced at the application layer.
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

        DB::statement('ALTER TABLE assignments ADD CONSTRAINT check_termination_after_hire CHECK (termination_date IS NULL OR termination_date >= hire_date);');
    }

    /**
     * Reverse the migrations.
     *
     * Dropping the table is sufficient as it cascades all constraints.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
