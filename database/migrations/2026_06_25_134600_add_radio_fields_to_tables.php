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
        Schema::table('edificios', function (Blueprint $table) {
            $table->string('punto_partida')->nullable();
            $table->decimal('dist_circunf', 8, 2)->nullable();
            $table->integer('radio_circ')->nullable();
            $table->decimal('distancia_camino', 8, 2)->nullable();
            $table->integer('radio_camino')->nullable();
            $table->string('tiempo_google_auto')->nullable();
            $table->text('observacion')->nullable();
        });

        Schema::table('modalidades', function (Blueprint $table) {
            $table->integer('radio_sige')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('edificios', function (Blueprint $table) {
            $table->dropColumn([
                'punto_partida',
                'dist_circunf',
                'radio_circ',
                'distancia_camino',
                'radio_camino',
                'tiempo_google_auto',
                'observacion'
            ]);
        });

        Schema::table('modalidades', function (Blueprint $table) {
            $table->dropColumn('radio_sige');
        });
    }
};
