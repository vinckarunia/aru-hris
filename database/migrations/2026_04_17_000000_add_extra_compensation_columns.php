<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add extra compensation columns required by pkwt_cj and pkwt_all templates.
 *
 * New columns:
 *  - allowance         : general/catch-all tunjangan (Tunjangan Allowance)
 *  - attendance_allowance : daily attendance incentive (Uang Kehadiran)
 *  - performance_bonus    : performance-based incentive (Insentif Kinerja)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contract_compensation', function (Blueprint $table) {
            $table->decimal('allowance', 15, 2)->default(0)->after('transport_allowance');
            $table->decimal('attendance_allowance', 15, 2)->default(0)->after('allowance');
            $table->decimal('performance_bonus', 15, 2)->default(0)->after('attendance_allowance');
        });
    }

    public function down(): void
    {
        Schema::table('contract_compensation', function (Blueprint $table) {
            $table->dropColumn(['allowance', 'attendance_allowance', 'performance_bonus']);
        });
    }
};
