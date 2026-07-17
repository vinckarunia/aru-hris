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
        Schema::table('workers', function (Blueprint $table) {
            $table->string('blood_type')->nullable();
            $table->integer('height')->nullable();
            $table->integer('weight')->nullable();
            $table->string('housing_status')->nullable();
            $table->string('phone_domicile')->nullable();
            $table->integer('size_shoe')->nullable();
            $table->string('size_uniform')->nullable();
            $table->string('reference_name')->nullable();
            $table->string('reference_relationship')->nullable();
            $table->string('reference_phone')->nullable();
            $table->string('emergency_name')->nullable();
            $table->string('emergency_relationship')->nullable();
            $table->string('emergency_phone')->nullable();
            $table->text('emergency_address')->nullable();
            $table->string('school_name_city')->nullable();
            $table->string('school_major')->nullable();
            $table->integer('school_graduation_year')->nullable();
            $table->json('work_experience')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('workers', function (Blueprint $table) {
            $table->dropColumn([
                'blood_type',
                'height',
                'weight',
                'housing_status',
                'phone_domicile',
                'size_shoe',
                'size_uniform',
                'reference_name',
                'reference_relationship',
                'reference_phone',
                'emergency_name',
                'emergency_relationship',
                'emergency_phone',
                'emergency_address',
                'school_name_city',
                'school_major',
                'school_graduation_year',
                'work_experience',
            ]);
        });
    }
};
