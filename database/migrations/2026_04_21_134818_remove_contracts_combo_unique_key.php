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
            // Add a regular index on assignment_id so the foreign key has an index to use
            $table->index('assignment_id');
            // Now we can safely drop the unique constraint
            $table->dropUnique('contracts_type_combo_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->unique(['assignment_id', 'contract_type', 'pkwt_type', 'pkwt_number'], 'contracts_type_combo_unique');
            $table->dropIndex(['assignment_id']);
        });
    }
};
