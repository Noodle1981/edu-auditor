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
        Schema::create('agente_cargos', function (Blueprint $table) {
            $table->id();
            $table->string('dni');
            $table->integer('centro')->nullable();
            $table->string('establecimiento')->nullable();
            $table->string('escalafon')->nullable();
            $table->string('cupof')->nullable();
            $table->integer('cue')->nullable();
            $table->string('cargo_horas')->nullable();
            $table->integer('horas_catedra')->nullable();
            $table->string('turno')->nullable();
            $table->string('plan_estudio')->nullable();
            $table->string('situacion_revista')->nullable();
            $table->string('norma_legal')->nullable();
            $table->text('observaciones')->nullable();
            $table->string('control_id')->nullable();

            // Foreign Key and Indexes
            $table->foreign('dni')->references('dni')->on('agentes')->onDelete('cascade');
            $table->index('dni', 'idx_cargos_dni');
            $table->index('cue', 'idx_cargos_cue');
            $table->index('situacion_revista', 'idx_cargos_revista');
            $table->index('escalafon', 'idx_cargos_escalafon');
            $table->index('horas_catedra', 'idx_cargos_horas');
            $table->index('establecimiento', 'idx_cargos_establecimiento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agente_cargos');
    }
};
