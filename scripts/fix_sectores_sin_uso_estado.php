<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== RESTAURANDO ESTADO 'SECTOR_SIN_USO' PARA LOS 190 REGISTROS ===" . PHP_EOL;

$affected = DB::table('depuracion_centros_sectores')
    ->where('observaciones', 'like', '%[Auto-vinculado SECTOR_SIN_USO%')
    ->update(['estado_depuracion' => 'SECTOR_SIN_USO']);

echo "Registros actualizados de regreso a 'SECTOR_SIN_USO': {$affected}" . PHP_EOL;

// Actualizar script para futuras ejecuciones
$scriptPath = base_path('scripts/autocomplete_depuracion_sectores_sin_uso.php');
if (file_exists($scriptPath)) {
    $content = file_get_contents($scriptPath);
    $content = str_replace("'estado_depuracion'  => 'ACTIVO'", "'estado_depuracion'  => 'SECTOR_SIN_USO'", $content);
    file_put_contents($scriptPath, $content);
}

echo "Script autocomplete_depuracion_sectores_sin_uso.php corregido para mantener 'SECTOR_SIN_USO'." . PHP_EOL;
