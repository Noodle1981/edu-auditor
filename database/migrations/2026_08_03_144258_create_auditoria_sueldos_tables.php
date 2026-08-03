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
        Schema::create('nominas_sueldos', function (Blueprint $table) {
            $table->id();
            $table->string('periodo'); // ej: '2026-05'
            $table->string('archivo_nombre');
            $table->integer('total_filas')->default(0);
            $table->integer('total_sectores')->default(0);
            $table->timestamp('fecha_importacion')->useCurrent();
            $table->timestamps();
        });

        Schema::create('auditoria_radio_resultados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nomina_id')->constrained('nominas_sueldos')->onDelete('cascade');
            $table->integer('sector')->nullable()->index();
            $table->string('zona_sueldo')->nullable();
            $table->string('zona_sige')->nullable();
            $table->boolean('coincide_zona')->default(true);
            $table->string('nivel_educativo')->nullable();
            $table->string('nombre_establecimiento')->nullable();
            $table->bigInteger('cue')->nullable()->index();
            $table->string('localidad')->nullable();
            $table->integer('radio_sueldo')->nullable();
            $table->integer('radio_sige')->nullable();
            $table->integer('radio_circ')->nullable();
            $table->integer('radio_camino')->nullable();
            $table->boolean('radio_justificado')->default(false);
            $table->string('inst_legal_radio')->nullable();
            $table->decimal('porc_pagado_mediana', 8, 2)->nullable();
            $table->string('escala_usada')->default('NUEVA');
            $table->integer('total_filas_docentes')->default(0);
            $table->string('estado_auditoria')->index();
            $table->string('estado_gestion')->default('PENDIENTE'); // PENDIENTE, EN_INVESTIGACION, JUSTIFICADO, CORREGIDO
            $table->text('notas_auditor')->nullable();
            $table->timestamps();
        });

        Schema::create('auditoria_sueldo_registros_viejos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nomina_id')->constrained('nominas_sueldos')->onDelete('cascade');
            $table->integer('sector')->nullable();
            $table->string('zona')->nullable();
            $table->decimal('a01_basico', 12, 2);
            $table->decimal('a04_radio', 12, 2);
            $table->decimal('porcentaje_pagado', 8, 2);
            $table->string('escala_detectada')->default('VIEJA'); // VIEJA, DESCONOCIDA
            $table->string('clasificacion_auditor')->default('PENDIENTE'); // PENDIENTE, ERROR_LIQUIDACION, CASO_ESPECIAL
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auditoria_sueldo_registros_viejos');
        Schema::dropIfExists('auditoria_radio_resultados');
        Schema::dropIfExists('nominas_sueldos');
    }
};
