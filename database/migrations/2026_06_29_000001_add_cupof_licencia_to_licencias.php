<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('licencias', function (Blueprint $table) {
            $table->string('cupof_licencia')->nullable()->after('documento_respaldo');
            $table->index('cupof_licencia', 'idx_licencias_cupof');
        });
    }

    public function down(): void
    {
        Schema::table('licencias', function (Blueprint $table) {
            $table->dropIndex('idx_licencias_cupof');
            $table->dropColumn('cupof_licencia');
        });
    }
};
