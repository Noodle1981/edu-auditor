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
        Schema::create('agentes', function (Blueprint $table) {
            $table->id();
            $table->string('dni')->unique();
            $table->string('nombre_agente')->nullable();
            $table->string('genero')->nullable();
            $table->string('legajo')->nullable();
            $table->date('fecha_alta')->nullable();

            $table->index('nombre_agente', 'idx_agentes_nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agentes');
    }
};
