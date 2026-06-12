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
        Schema::create('designaciones', function (Blueprint $table) {
            $table->id();
            $table->integer('centro')->nullable();
            $table->string('establecimiento')->nullable();
            $table->string('escalafon')->nullable();
            $table->string('cupof')->nullable();
            $table->integer('cue')->nullable();
            $table->string('cargo_horas')->nullable();
            $table->integer('horas_catedra')->nullable();
            $table->string('turno')->nullable();
            $table->string('plan_estudio')->nullable();
            $table->string('nombre_agente')->nullable();
            $table->string('dni')->nullable();
            $table->string('genero')->nullable();
            $table->string('legajo')->nullable();
            $table->date('fecha_alta')->nullable();
            $table->string('situacion_revista')->nullable();
            $table->string('norma_legal')->nullable();
            $table->text('observaciones')->nullable();
            $table->string('control_id')->nullable();

            // Foreign Key and Indexes
            $table->foreign('dni')->references('dni')->on('agentes')->onDelete('cascade');
            $table->index('dni', 'idx_designaciones_dni');
            $table->index('cue', 'idx_designaciones_cue');
            $table->index('nombre_agente', 'idx_designaciones_nombre');
            $table->index('situacion_revista', 'idx_designaciones_revista');
            $table->index('escalafon', 'idx_designaciones_escalafon');
            $table->index('horas_catedra', 'idx_designaciones_horas');
            $table->index('establecimiento', 'idx_designaciones_establecimiento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('designaciones');
    }
};
