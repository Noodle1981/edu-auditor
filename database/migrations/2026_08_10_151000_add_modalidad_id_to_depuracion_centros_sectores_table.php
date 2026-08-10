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
                $table->unsignedBigInteger('modalidad_id')->nullable()->after('establecimiento_id');
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
                $table->dropColumn('modalidad_id');
            });
        }
    }
};
