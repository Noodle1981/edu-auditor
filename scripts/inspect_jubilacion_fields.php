<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== COLUMNAS DE NOMINA_SUELDO_REGISTROS ===" . PHP_EOL;
$cols = Schema::getColumnListing('nomina_sueldo_registros');
foreach ($cols as $c) {
    echo "  • {$c}" . PHP_EOL;
}

echo PHP_EOL . "=== MUESTRA DE REGISTROS PARA VER CAMPOS DE EDAD / FECHA NAC / ANTIGUEDAD ===" . PHP_EOL;
$sample = DB::table('nomina_sueldo_registros')->first();
if ($sample) {
    foreach ((array)$sample as $k => $v) {
        if (str_contains(strtolower($k), 'fec') || str_contains(strtolower($k), 'nac') || str_contains(strtolower($k), 'anti') || str_contains(strtolower($k), 'a02') || str_contains(strtolower($k), 'ingr') || str_contains(strtolower($k), 'anio') || str_contains(strtolower($k), 'edad')) {
            echo "  [INTERES] {$k} => {$v}" . PHP_EOL;
        }
    }
}

echo PHP_EOL . "=== COLUMNAS Y DATOS EN AGENTES (SIGE) Y DESIGNACIONES ===" . PHP_EOL;
$agenteCols = Schema::getColumnListing('agentes');
echo "Agentes: " . implode(', ', $agenteCols) . PHP_EOL;
$desigCols = Schema::getColumnListing('designaciones');
echo "Designaciones: " . implode(', ', $desigCols) . PHP_EOL;

echo PHP_EOL . "==================================================" . PHP_EOL;
