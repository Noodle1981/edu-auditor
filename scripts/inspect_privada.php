<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== INSPECCIÓN PREVIA: ENSEÑANZA PRIVADA ===" . PHP_EOL;

$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(gestion)) = 'PRIVADA'")
    ->get();

echo "Total candidatos PRIVADA sin vincular: " . $candidatos->count() . PHP_EOL;

$breakdown = $candidatos->groupBy(fn($d) => "Nivel: '{$d->nivel}' | Gestion: '{$d->gestion}'");
foreach ($breakdown as $ng => $items) {
    echo "  • {$ng} → {$items->count()} registros" . PHP_EOL;
}

echo PHP_EOL . "=== PRUEBA DE MATCHING EN SIGE (SÓLO CUEs CON 1 SOLO NIVEL EN PRIVADA) ===" . PHP_EOL;

// Modalidades de PRIVADA
$modsPrivada = DB::table('modalidades as m')
    ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
    ->whereNull('m.deleted_at')
    ->where('m.direccion_area', 'PRIVADA')
    ->select('m.id as modalidad_id', 'm.establecimiento_id', 'm.sector', 'm.nivel_educativo', 'm.radio_sige', 'e.cue', 'e.nombre as nom_establecimiento')
    ->get();

echo "Total modalidades activas en Área PRIVADA en SIGE: " . $modsPrivada->count() . PHP_EOL;

// Establecimientos de PRIVADA que tienen exactamente 1 modalidad
$estPrivadaUnicoNivel = $modsPrivada
    ->groupBy('establecimiento_id')
    ->filter(fn($mods) => $mods->count() === 1)
    ->map(fn($mods) => $mods->first());

echo "Establecimientos en PRIVADA con EXACTAMENTE 1 solo nivel: " . $estPrivadaUnicoNivel->count() . PHP_EOL;

echo PHP_EOL . "Muestra de los primeros 10 candidatos a evaluar:" . PHP_EOL;
foreach ($candidatos->take(10) as $c) {
    $sec = (int) $c->sector;
    $matches = $modsPrivada->filter(fn($m) => (int)$m->sector === $sec);
    echo "ID: {$c->id} | C:{$c->centro} S:{$c->sector} | Nom: {$c->nom_sector} | Nivel: {$c->nivel}" . PHP_EOL;
    if ($matches->count() === 0) {
        echo "   -> Sin match en PRIVADA" . PHP_EOL;
    } else {
        foreach ($matches as $m) {
            $cantLevels = DB::table('modalidades')->where('establecimiento_id', $m->establecimiento_id)->whereNull('deleted_at')->count();
            echo "   -> Match CUE {$m->cue} ({$m->nom_establecimiento}) [{$m->nivel_educativo}] | Total niveles CUE: {$cantLevels}" . PHP_EOL;
        }
    }
}
