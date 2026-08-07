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
        if (!Schema::hasTable('depuracion_centros_sectores')) {
            Schema::create('depuracion_centros_sectores', function (Blueprint $table) {
                $table->id();
                $table->integer('centro')->index();
                $table->integer('sector')->index();
                $table->string('nom_centro')->nullable();
                $table->string('nom_sector')->nullable();
                $table->string('nivel')->nullable();
                $table->string('gestion')->nullable();
                $table->integer('cantidad_liquidaciones')->default(0);
                $table->string('estado_depuracion')->index(); // ACTIVO, BAJA_VOLUMETRÍA, CENTRO_SIN_USO, SECTOR_SIN_USO, SUELDO_NO_CATALOGADO
                $table->text('observaciones')->nullable();
                $table->timestamps();

                $table->unique(['centro', 'sector']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('depuracion_centros_sectores');
    }
};
