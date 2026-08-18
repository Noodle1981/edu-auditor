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
        if (Schema::hasTable('depuracion_centros_sectores')) {
            Schema::table('depuracion_centros_sectores', function (Blueprint $table) {
                if (!Schema::hasColumn('depuracion_centros_sectores', 'cantidad_con_cobro')) {
                    $table->integer('cantidad_con_cobro')->default(0)->after('cantidad_liquidaciones');
                }
                if (!Schema::hasColumn('depuracion_centros_sectores', 'cantidad_sin_cobro')) {
                    $table->integer('cantidad_sin_cobro')->default(0)->after('cantidad_con_cobro');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('depuracion_centros_sectores')) {
            Schema::table('depuracion_centros_sectores', function (Blueprint $table) {
                if (Schema::hasColumn('depuracion_centros_sectores', 'cantidad_sin_cobro')) {
                    $table->dropColumn('cantidad_sin_cobro');
                }
                if (Schema::hasColumn('depuracion_centros_sectores', 'cantidad_con_cobro')) {
                    $table->dropColumn('cantidad_con_cobro');
                }
            });
        }
    }
};
