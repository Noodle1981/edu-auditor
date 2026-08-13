<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== CANDIDATOS EN DEPURACION SECUNDARIO / MEDIA / TRANSFERIDOS ===" . PHP_EOL;

$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->select('id', 'centro', 'sector', 'nom_sector', 'nivel', 'gestion')
    ->get()
    ->filter(function($d) {
        $ng = mb_strtoupper(trim(($d->nivel ?? '') . ' ' . ($d->gestion ?? '')));
        return str_contains($ng, 'MEDIA') || str_contains($ng, 'TRANSFERIDO') || str_contains($ng, 'EGB III');
    });

echo "Total candidatos encontrados: " . $candidatos->count() . PHP_EOL;

$nivelesGestion = $candidatos->map(fn($d) => "Nivel: '{$d->nivel}' | Gestion: '{$d->gestion}'")->unique();
foreach ($nivelesGestion as $ng) {
    echo "  • {$ng}" . PHP_EOL;
}

echo PHP_EOL . "=== MODALIDADES EN SIGE PARA DIRECCION DE AREA SECUNDARIO / TECNICA (PUBLICO) ===" . PHP_EOL;

$mods = DB::table('modalidades')
    ->whereNull('deleted_at')
    ->where('direccion_area', '!=', 'PRIVADA')
    ->where(function($q) {
        $q->where('direccion_area', 'SECUNDARIO')
          ->orWhere('direccion_area', 'TÉCNICA')
          ->orWhereIn('nivel_educativo', ['SECUNDARIO', 'TÉCNICO', 'AGROTECNICA']);
    })
    ->select('direccion_area', 'nivel_educativo', DB::raw('count(*) as cant'))
    ->groupBy('direccion_area', 'nivel_educativo')
    ->get();

foreach ($mods as $m) {
    echo "Área: '{$m->direccion_area}' | Nivel: '{$m->nivel_educativo}' | Cant: {$m->cant}" . PHP_EOL;
}
