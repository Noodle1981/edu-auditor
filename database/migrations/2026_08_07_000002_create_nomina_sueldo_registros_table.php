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
        if (!Schema::hasTable('nomina_sueldo_registros')) {
            Schema::create('nomina_sueldo_registros', function (Blueprint $table) {
                $table->id();
                $table->foreignId('nomina_id')->index();
                $table->integer('centro')->index();
                $table->integer('sector')->index();
                $table->integer('clase')->nullable();
                $table->string('cuil')->nullable();
                $table->string('apellido_nombre')->nullable();
                $table->string('zona')->nullable();
                $table->double('a01_basico')->nullable();
                $table->double('a04_radio')->nullable();
                $table->double('porcentaje_calculado')->nullable();
                $table->integer('radio_deducido')->nullable();
                $table->timestamps();

                $table->index(['nomina_id', 'centro', 'sector']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nomina_sueldo_registros');
    }
};
