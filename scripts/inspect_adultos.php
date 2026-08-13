<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== MODALIDADES CON DIRECCIÓN DE ÁREA 'ADULTOS' O NIVELES DE ADULTOS ===" . PHP_EOL;

$areas = DB::table('modalidades')
    ->select('direccion_area', 'nivel_educativo', DB::raw('count(*) as cant'))
    ->where('direccion_area', 'like', '%ADULTO%')
    ->orWhere('nivel_educativo', 'like', '%CENS%')
    ->orWhere('nivel_educativo', 'like', '%UEPA%')
    ->orWhere('nivel_educativo', 'like', '%PROPAA%')
    ->groupBy('direccion_area', 'nivel_educativo')
    ->get();

foreach ($areas as $a) {
    echo "Área: {$a->direccion_area} | Nivel: {$a->nivel_educativo} | Cant: {$a->cant}" . PHP_EOL;
}

echo PHP_EOL . "=== CANDIDATOS EN DEPURACION SIN VINCULAR QUE DICEN UEPA / CENS / NOCTURNA / ADULTOS O NIVEL PRIMARIA OFICIAL ===" . PHP_EOL;

$dep = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(nivel)) = 'PRIMARIA'")
    ->whereRaw("UPPER(TRIM(gestion)) = 'OFICIAL'")
    ->select('id', 'centro', 'sector', 'nom_sector', 'nivel', 'gestion')
    ->limit(15)
    ->get();

foreach ($dep as $d) {
    echo "ID: {$d->id} | C:{$d->centro} S:{$d->sector} | Nom: {$d->nom_sector}" . PHP_EOL;
}
