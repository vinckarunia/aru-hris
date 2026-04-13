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
        Schema::create('internal_employees', function (Blueprint $table) {
            $table->id();
            $table->string('nik_aru')->nullable()->unique();
            $table->string('name');
            $table->string('ktp_number', 16)->unique();
            $table->string('kk_number', 16)->nullable();
            $table->string('birth_place')->nullable();
            $table->date('birth_date')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('education', 100)->nullable();
            $table->string('religion', 50)->nullable();
            $table->string('tax_status', 50)->nullable();
            $table->text('address_ktp')->nullable();
            $table->text('address_domicile')->nullable();
            $table->string('mother_name')->nullable();
            $table->string('npwp')->nullable();
            $table->string('bpjs_kesehatan')->nullable();
            $table->string('bpjs_ketenagakerjaan')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_number', 100)->nullable();
            $table->string('position')->nullable();
            $table->string('department')->nullable();
            $table->date('join_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'resign'])->default('active');
            $table->timestamps();
        });

        // Add internal_employee_id to users table (mirrors worker_id pattern)
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('internal_employee_id')
                ->nullable()
                ->after('worker_id')
                ->constrained('internal_employees')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['internal_employee_id']);
            $table->dropColumn('internal_employee_id');
        });

        Schema::dropIfExists('internal_employees');
    }
};
