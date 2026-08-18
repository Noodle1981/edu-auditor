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
        if (!Schema::hasTable('jubilaciones_seguimiento')) {
            Schema::create('jubilaciones_seguimiento', function (Blueprint $table) {
                $table->id();
                $table->string('cuil')->index();
                $table->integer('centro')->nullable()->index();
                $table->integer('sector')->nullable()->index();
                $table->string('estado_jubilacion')->default('PENDIENTE')->index(); // PENDIENTE, ACTIVO, JUBILADO, EN_TRAMITE
                $table->text('observaciones')->nullable();
                $table->timestamps();

                $table->unique(['cuil', 'centro', 'sector'], 'uniq_cuil_centro_sector');
            });
        }

        if (Schema::hasTable('nomina_sueldo_registros')) {
            Schema::table('nomina_sueldo_registros', function (Blueprint $table) {
                if (!Schema::hasColumn('nomina_sueldo_registros', 'fecha_nacimiento')) {
                    $table->string('fecha_nacimiento')->nullable()->index();
                }
                if (!Schema::hasColumn('nomina_sueldo_registros', 'antiguedad_anios')) {
                    $table->integer('antiguedad_anios')->nullable()->index();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jubilaciones_seguimiento');

        if (Schema::hasTable('nomina_sueldo_registros')) {
            Schema::table('nomina_sueldo_registros', function (Blueprint $table) {
                $table->dropColumn(['fecha_nacimiento', 'antiguedad_anios']);
            });
        }
    }
};
