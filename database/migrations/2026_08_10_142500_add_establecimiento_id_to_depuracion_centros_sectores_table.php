<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('depuracion_centros_sectores')) {
            Schema::table('depuracion_centros_sectores', function (Blueprint $table) {
                $table->unsignedBigInteger('establecimiento_id')->nullable()->after('estado_depuracion');
            });

            // Reparar registros ya saneados extrayendo el CUE desde las observaciones
            $rows = DB::table('depuracion_centros_sectores')
                ->where('observaciones', 'like', 'Saneado y vinculado a CUE%')
                ->get();

            foreach ($rows as $row) {
                if (preg_match('/CUE\s+(\d+)/i', $row->observaciones, $matches)) {
                    $cue = (int) $matches[1];
                    $estId = DB::table('establecimientos')->where('cue', $cue)->value('id');
                    if ($estId) {
                        DB::table('depuracion_centros_sectores')
                            ->where('id', $row->id)
                            ->update(['establecimiento_id' => $estId]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('depuracion_centros_sectores')) {
            Schema::table('depuracion_centros_sectores', function (Blueprint $table) {
                $table->dropColumn('establecimiento_id');
            });
        }
    }
};
