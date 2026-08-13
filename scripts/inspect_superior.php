<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== CANDIDATOS EN DEPURACION PARA SUPERIOR ===" . PHP_EOL;

$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(gestion)) = 'OFICIAL'")
    ->get()
    ->filter(function($d) {
        $ng = mb_strtoupper(trim(($d->nivel ?? '') . ' ' . ($d->nom_sector ?? '')));
        return str_contains($ng, 'SUPERIOR') || str_contains($ng, 'TERCIARIO') || str_contains($ng, 'INSTITUTO');
    });

echo "Total candidatos encontrados: " . $candidatos->count() . PHP_EOL;

$nivelesGestion = $candidatos->map(fn($d) => "Nivel: '{$d->nivel}' | Sector: {$d->sector} | NomSector: '{$d->nom_sector}'");
foreach ($nivelesGestion as $ng) {
    echo "  • {$ng}" . PHP_EOL;
}

echo PHP_EOL . "=== MODALIDADES EN SIGE PARA DIRECCION DE AREA SUPERIOR (PUBLICO) ===" . PHP_EOL;

$mods = DB::table('modalidades')
    ->whereNull('deleted_at')
    ->where('direccion_area', '!=', 'PRIVADA')
    ->where(function($q) {
        $q->where('direccion_area', 'SUPERIOR')
          ->orWhere('nivel_educativo', 'SUPERIOR');
    })
    ->select('direccion_area', 'nivel_educativo', DB::raw('count(*) as cant'))
    ->groupBy('direccion_area', 'nivel_educativo')
    ->get();

foreach ($mods as $m) {
    echo "Área: '{$m->direccion_area}' | Nivel: '{$m->nivel_educativo}' | Cant: {$m->cant}" . PHP_EOL;
}
