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
        Schema::table('agente_cargos', function (Blueprint $table) {
            $table->index(['dni', 'anio'], 'idx_agente_cargos_dni_anio');
        });

        Schema::table('licencias', function (Blueprint $table) {
            $table->index(['dni', 'anio'], 'idx_licencias_dni_anio');
        });

        Schema::table('modalidades', function (Blueprint $table) {
            $table->index(['establecimiento_id'], 'idx_modalidades_establecimiento_id');
        });

        Schema::table('designaciones', function (Blueprint $table) {
            $table->index(['cue', 'turno', 'anio'], 'idx_designaciones_cue_turno_anio');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agente_cargos', function (Blueprint $table) {
            $table->dropIndex('idx_agente_cargos_dni_anio');
        });

        Schema::table('licencias', function (Blueprint $table) {
            $table->dropIndex('idx_licencias_dni_anio');
        });

        Schema::table('modalidades', function (Blueprint $table) {
            $table->dropIndex('idx_modalidades_establecimiento_id');
        });

        Schema::table('designaciones', function (Blueprint $table) {
            $table->dropIndex('idx_designaciones_cue_turno_anio');
        });
    }
};
