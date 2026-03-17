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
     * Note: The PostgreSQL partial index (`CREATE UNIQUE INDEX ... WHERE end_date IS NULL`)
     * that enforced only one active contract per assignment has been removed, as MySQL does
     * not support partial indexes. This uniqueness constraint is now enforced at the
     * application layer (e.g., in ContractService before creating a new contract).
     */
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')
                  ->constrained('assignments')
                  ->onDelete('cascade');
            $table->enum('contract_type', ['Kontrak','Harian']);
            $table->enum('pkwt_type', ['PKWT','PKWTT'])->nullable();
            $table->integer('pkwt_number')->unsigned()->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('duration_months')->nullable();
            $table->text('evaluation_notes')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();

            $table->unique(['assignment_id', 'contract_type', 'pkwt_type', 'pkwt_number'], 'contracts_type_combo_unique');
        });

        DB::statement('ALTER TABLE contracts ADD CONSTRAINT check_pkwt_number_positive CHECK (pkwt_number > 0);');
        DB::statement('ALTER TABLE contracts ADD CONSTRAINT check_pkwtt_enddate CHECK ((pkwt_type = \'PKWTT\' AND end_date IS NULL) OR pkwt_type = \'PKWT\' OR pkwt_type IS NULL);');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
