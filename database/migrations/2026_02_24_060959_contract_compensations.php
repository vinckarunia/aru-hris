<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contract_compensation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')
                  ->constrained('contracts')
                  ->onDelete('cascade')
                  ->unique();
            $table->decimal('base_salary', 15, 2)->default(0);
            $table->enum('salary_rate', ['hourly', 'daily', 'monthly', 'yearly'])->default('monthly')->nullable();
            $table->decimal('meal_allowance', 15, 2)->default(0);
            $table->decimal('transport_allowance', 15, 2)->default(0);
            $table->enum('allowance_rate', ['hourly', 'daily', 'monthly', 'yearly'])->default('daily')->nullable();
            $table->decimal('overtime_weekday_rate', 15, 2)->default(0);
            $table->decimal('overtime_holiday_rate', 15, 2)->default(0);
            $table->enum('overtime_rate', ['hourly', 'daily', 'monthly', 'yearly'])->default('hourly')->nullable();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE contract_compensation ADD CONSTRAINT check_base_salary_nonnegative CHECK (base_salary >= 0);');
        DB::statement('ALTER TABLE contract_compensation ADD CONSTRAINT check_meal_allowance_nonnegative CHECK (meal_allowance >= 0);');
        DB::statement('ALTER TABLE contract_compensation ADD CONSTRAINT check_transport_allowance_nonnegative CHECK (transport_allowance >= 0);');
        DB::statement('ALTER TABLE contract_compensation ADD CONSTRAINT check_overtime_weekday_nonnegative CHECK (overtime_weekday_rate >= 0);');
        DB::statement('ALTER TABLE contract_compensation ADD CONSTRAINT check_overtime_holiday_nonnegative CHECK (overtime_holiday_rate >= 0);');
    }

    /**
     * Reverse the migrations.
     *
     * Dropping the table is sufficient as it cascades all constraints.
     * MySQL does not support `DROP CONSTRAINT IF EXISTS`; use `DROP CHECK` syntax
     * only when rolling back without dropping the table.
     */
    public function down(): void
    {
        Schema::dropIfExists('contract_compensation');
    }
};
