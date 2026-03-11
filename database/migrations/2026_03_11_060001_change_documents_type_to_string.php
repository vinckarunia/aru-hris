<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Converts the `documents.type` column from a database-level ENUM to a plain string.
 *
 * ## Rationale
 * A database-level ENUM requires a new migration every time a new document type is added.
 * By using a plain string column, all type definitions are managed exclusively through
 * the {@see \App\Enums\DocumentType} PHP Enum in application code — adding a new document
 * type requires only adding a new case to that Enum, with no DB schema change.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Drop old DB-level enum and replace with a plain string.
            // Existing values ('KK', 'KTP') remain valid and are handled by DocumentType Enum.
            $table->string('type', 50)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->enum('type', ['KK', 'KTP'])->change();
        });
    }
};
