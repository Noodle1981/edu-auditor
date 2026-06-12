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
        Schema::create('licencias', function (Blueprint $table) {
            $table->id();
            $table->integer('id_tramite')->nullable();
            $table->dateTime('fecha_carga')->nullable();
            $table->string('nombre_agente')->nullable();
            $table->string('dni')->nullable();
            $table->string('genero')->nullable();
            $table->string('tipo_licencia')->nullable();
            $table->string('documento_respaldo')->nullable();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->integer('dias')->nullable();
            $table->integer('referencia_interna')->nullable();

            // Foreign Key and Indexes
            $table->foreign('dni')->references('dni')->on('agentes')->onDelete('cascade');
            $table->index('dni', 'idx_licencias_dni');
            $table->index('nombre_agente', 'idx_licencias_nombre');
            $table->index('tipo_licencia', 'idx_licencias_tipo');
            $table->index('fecha_inicio', 'idx_licencias_inicio');
            $table->index('fecha_fin', 'idx_licencias_fin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licencias');
    }
};
