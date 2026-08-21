<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE contracts MODIFY COLUMN contract_type ENUM('Kontrak', 'Harian', 'Part-time', 'Mitra') NOT NULL");
        }

        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('template_mitra_id')
                ->nullable()
                ->after('template_part_time_id')
                ->constrained('document_templates')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('template_mitra_id');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::table('contracts')->where('contract_type', 'Mitra')->update(['contract_type' => 'Kontrak']);
            DB::statement("ALTER TABLE contracts MODIFY COLUMN contract_type ENUM('Kontrak', 'Harian', 'Part-time') NOT NULL");
        }
    }
};
