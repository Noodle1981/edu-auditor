<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== INSPECCIÓN CENTROS SIN USO (CENTRO_SIN_USO) ===" . PHP_EOL;

$centrosSinUso = DB::table('depuracion_centros_sectores')
    ->where('estado_depuracion', 'CENTRO_SIN_USO')
    ->get();

echo "Total registros en CENTRO_SIN_USO: " . $centrosSinUso->count() . PHP_EOL;

$centrosUnicos = $centrosSinUso->pluck('centro')->unique();
echo "Centros involucrados: " . $centrosUnicos->implode(', ') . PHP_EOL . PHP_EOL;

foreach ($centrosSinUso as $c) {
    $sec = (int) $c->sector;
    $matches = DB::table('modalidades as m')
        ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
        ->whereNull('m.deleted_at')
        ->whereRaw("CAST(m.sector AS INTEGER) = ?", [$sec])
        ->select('e.cue', 'e.nombre as nom_escuela', 'm.nivel_educativo', 'm.direccion_area')
        ->get();

    echo "ID: {$c->id} | Centro {$c->centro} Sector {$c->sector} | Nom: '{$c->nom_sector}' | Nivel: '{$c->nivel}' ({$c->gestion})" . PHP_EOL;
    if ($matches->count() === 0) {
        echo "   -> Sin match en SIGE" . PHP_EOL;
    } else {
        foreach ($matches as $m) {
            echo "   -> Match SIGE: CUE {$m->cue} ({$m->nom_escuela}) [{$m->direccion_area} - {$m->nivel_educativo}]" . PHP_EOL;
        }
    }
}
