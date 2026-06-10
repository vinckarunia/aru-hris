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
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('template_paklaring_a_id')->nullable()->constrained('document_templates')->nullOnDelete();
            $table->foreignId('template_paklaring_b_id')->nullable()->constrained('document_templates')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['template_paklaring_a_id']);
            $table->dropColumn('template_paklaring_a_id');
            $table->dropForeign(['template_paklaring_b_id']);
            $table->dropColumn('template_paklaring_b_id');
        });
    }
};
