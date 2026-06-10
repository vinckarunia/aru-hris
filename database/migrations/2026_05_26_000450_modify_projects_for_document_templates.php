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
            $table->foreignId('template_kontrak_id')->nullable()->constrained('document_templates')->nullOnDelete();
            $table->foreignId('template_harian_id')->nullable()->constrained('document_templates')->nullOnDelete();
            $table->foreignId('template_part_time_id')->nullable()->constrained('document_templates')->nullOnDelete();
            $table->foreignId('template_surat_tugas_id')->nullable()->constrained('document_templates')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['template_kontrak_id']);
            $table->dropColumn('template_kontrak_id');
            $table->dropForeign(['template_harian_id']);
            $table->dropColumn('template_harian_id');
            $table->dropForeign(['template_part_time_id']);
            $table->dropColumn('template_part_time_id');
            $table->dropForeign(['template_surat_tugas_id']);
            $table->dropColumn('template_surat_tugas_id');
        });
    }
};
