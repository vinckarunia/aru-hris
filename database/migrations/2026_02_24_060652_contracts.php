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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')
                  ->constrained('assignments')
                  ->onDelete('cascade');
            $table->enum('contract_type', ['PKWT','PKWTT']);
            $table->integer('contract_number')->unsigned()->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('duration_months')->nullable();
            $table->text('evaluation_notes')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();

            $table->unique(['assignment_id','contract_number']);
        });

        DB::statement('CREATE UNIQUE INDEX contracts_assignment_active_unique ON contracts(assignment_id) WHERE end_date IS NULL;');
        DB::statement('ALTER TABLE contracts ADD CONSTRAINT check_contract_number_positive CHECK (contract_number > 0);');
        DB::statement('ALTER TABLE contracts ADD CONSTRAINT check_pkwtt_enddate CHECK ((contract_type = \'PKWTT\' AND end_date IS NULL) OR contract_type = \'PKWT\');');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS contracts_assignment_active_unique;');
        DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS check_contract_number_positive;');
        DB::statement('ALTER TABLE contracts DROP CONSTRAINT IF EXISTS check_pkwtt_enddate;');
        Schema::dropIfExists('contracts');
    }
};
