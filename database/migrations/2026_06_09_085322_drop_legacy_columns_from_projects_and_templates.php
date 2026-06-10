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
        if (Schema::hasColumn('projects', 'pkwt_type')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->dropColumn('pkwt_type');
            });
        }

        if (Schema::hasColumn('document_templates', 'content_html')) {
            Schema::table('document_templates', function (Blueprint $table) {
                $table->dropColumn('content_html');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('projects', 'pkwt_type')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->string('pkwt_type')->default('vdi')->after('name');
            });
        }

        if (!Schema::hasColumn('document_templates', 'content_html')) {
            Schema::table('document_templates', function (Blueprint $table) {
                $table->longText('content_html')->nullable()->after('type');
            });
        }
    }
};
