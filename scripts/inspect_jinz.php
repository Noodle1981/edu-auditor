<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== INSPECCIÓN DE REGISTROS J.I.N.Z. EN DEPURACIÓN (PRIMARIA OFICIAL) ===" . PHP_EOL;

$jinzDepuracion = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(nivel)) = 'PRIMARIA'")
    ->whereRaw("UPPER(TRIM(gestion)) = 'OFICIAL'")
    ->get()
    ->filter(function($d) {
        $nom = mb_strtoupper($d->nom_sector ?? '');
        return str_contains($nom, 'J.I.N') || str_contains($nom, 'JINZ') || str_contains($nom, 'J.I.N.Z');
    });

echo "Total J.I.N.Z. sin vincular encontrados: " . $jinzDepuracion->count() . PHP_EOL . PHP_EOL;

foreach ($jinzDepuracion->take(20) as $d) {
    $sec = (int) $d->sector;
    $matches = DB::table('modalidades as m')
        ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
        ->whereNull('m.deleted_at')
        ->whereRaw("CAST(m.sector AS INTEGER) = ?", [$sec])
        ->select('m.id as modalidad_id', 'm.establecimiento_id', 'e.cue', 'e.nombre as nom_escuela', 'm.nivel_educativo')
        ->get();

    // Identificar Sede (CUE terminado en 00 o nombre que contenga "Sede")
    $sedes = $matches->filter(function($m) {
        $cueStr = (string) $m->cue;
        $nomUpper = mb_strtoupper($m->nom_escuela);
        return str_ends_with($cueStr, '00') || str_contains($nomUpper, 'SEDE');
    });

    echo "ID: {$d->id} | Centro {$d->centro} Sector {$d->sector} | Nom: '{$d->nom_sector}'" . PHP_EOL;
    if ($matches->count() === 0) {
        echo "   -> Sin match en SIGE" . PHP_EOL;
    } else {
        echo "   -> Total matches en SIGE: " . $matches->count() . PHP_EOL;
        if ($sedes->count() === 1) {
            $s = $sedes->first();
            echo "   -> ✔ SEDE ÚNICA ENCONTRADA: CUE {$s->cue} ({$s->nom_escuela})" . PHP_EOL;
        } else {
            foreach ($matches as $m) {
                echo "      Match: CUE {$m->cue} ({$m->nom_escuela})" . PHP_EOL;
            }
        }
    }
}
