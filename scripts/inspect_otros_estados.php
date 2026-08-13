<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== ESTADOS EN DEPURACION CENTROS SECTORES ===" . PHP_EOL;

$estados = DB::table('depuracion_centros_sectores')
    ->select('estado_depuracion', DB::raw('count(*) as cant'), DB::raw('sum(case when establecimiento_id is not null then 1 else 0 end) as vinculados'), DB::raw('sum(case when establecimiento_id is null then 1 else 0 end) as sin_vincular'))
    ->groupBy('estado_depuracion')
    ->get();

foreach ($estados as $e) {
    echo "Estado: '{$e->estado_depuracion}' | Total: {$e->cant} | Vinculados: {$e->vinculados} | Sin vincular: {$e->sin_vincular}" . PHP_EOL;
}

echo PHP_EOL . "=== CANDIDATOS EN ESTADOS DISTINTOS DE 'ACTIVO' SIN VINCULAR ===" . PHP_EOL;

$otros = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', '!=', 'ACTIVO')
    ->select('estado_depuracion', 'nivel', 'gestion', DB::raw('count(*) as cant'))
    ->groupBy('estado_depuracion', 'nivel', 'gestion')
    ->get();

foreach ($otros as $o) {
    echo "Estado: '{$o->estado_depuracion}' | Nivel: '{$o->nivel}' | Gestion: '{$o->gestion}' | Cant: {$o->cant}" . PHP_EOL;
}
