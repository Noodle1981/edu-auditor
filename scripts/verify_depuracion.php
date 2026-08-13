<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "==================================================" . PHP_EOL;
echo " VERIFICACIÓN POST-EJECUCIÓN DEPURACIÓN" . PHP_EOL;
echo "==================================================" . PHP_EOL;

// 1. Total autovinculados
$totalAuto = DB::table('depuracion_centros_sectores')
    ->where('observaciones', 'like', '%[Auto-vinculado%')
    ->count();

echo "1. Total registros autovinculados guardados en BD: {$totalAuto}" . PHP_EOL;

// 2. Verificar integridad de Foreign Keys (que establecimiento_id y modalidad_id existan)
$invalidEst = DB::table('depuracion_centros_sectores as d')
    ->leftJoin('establecimientos as e', 'e.id', '=', 'd.establecimiento_id')
    ->whereNotNull('d.establecimiento_id')
    ->whereNull('e.id')
    ->count();

$invalidMod = DB::table('depuracion_centros_sectores as d')
    ->leftJoin('modalidades as m', 'm.id', '=', 'd.modalidad_id')
    ->whereNotNull('d.modalidad_id')
    ->whereNull('m.id')
    ->count();

echo "2. Chequeo de integridad de Establecimiento FK: " . ($invalidEst === 0 ? "OK (0 errores)" : "ERROR ({$invalidEst} huérfanos)") . PHP_EOL;
echo "3. Chequeo de integridad de Modalidad FK: " . ($invalidMod === 0 ? "OK (0 errores)" : "ERROR ({$invalidMod} huérfanos)") . PHP_EOL;

// 3. Coincidencia de sector entre depuracion y modalidad vinculada
$mismatchedSectors = DB::table('depuracion_centros_sectores as d')
    ->join('modalidades as m', 'm.id', '=', 'd.modalidad_id')
    ->where('d.observaciones', 'like', '%[Auto-vinculado%')
    ->whereRaw("CAST(d.sector AS INTEGER) != CAST(m.sector AS INTEGER)")
    ->count();

echo "4. Coincidencia de Sector entre Depuración y Modalidad: " . ($mismatchedSectors === 0 ? "OK (0 discrepancias)" : "ERROR ({$mismatchedSectors} discrepancias)") . PHP_EOL;

echo PHP_EOL . "Breakdown de autovinculaciones por script:" . PHP_EOL;
$prim = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%PRIMARIA OFICIAL%')->count();
$adul = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%ADULTOS%')->count();
$secu = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%SECUNDARIO OFICIAL%')->count();
$supe = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%SUPERIOR OFICIAL%')->count();
$priv = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%PRIVADA%')->count();
$jinz = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%J.I.N.Z. SEDE%')->count();
$sinu = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%SECTOR_SIN_USO%')->count();
$csinu = DB::table('depuracion_centros_sectores')->where('observaciones', 'like', '%CENTRO_SIN_USO%')->count();

echo "  • PRIMARIA OFICIAL : {$prim}" . PHP_EOL;
echo "  • ADULTOS          : {$adul}" . PHP_EOL;
echo "  • SECUNDARIO       : {$secu}" . PHP_EOL;
echo "  • SUPERIOR         : {$supe}" . PHP_EOL;
echo "  • PRIVADA (1 nivel): {$priv}" . PHP_EOL;
echo "  • J.I.N.Z. SEDES   : {$jinz}" . PHP_EOL;
echo "  • SECTORES SIN USO : {$sinu}" . PHP_EOL;
echo "  • CENTROS SIN USO  : {$csinu}" . PHP_EOL;

echo PHP_EOL . "==================================================" . PHP_EOL;
