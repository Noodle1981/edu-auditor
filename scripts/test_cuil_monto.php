<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$cuilTest = '27057458106';
echo "=== ANÁLISIS DE MONTOS PARA CUIL {$cuilTest} ===" . PHP_EOL;

$records = DB::table('nomina_sueldo_registros')
    ->where('cuil', 'like', "%{$cuilTest}%")
    ->get();

echo "Total registros: " . $records->count() . PHP_EOL;
$totalMonto = 0;
foreach ($records as $r) {
    $montoFila = ($r->a01_basico ?? 0) + ($r->a04_radio ?? 0);
    $totalMonto += $montoFila;
    echo "• Centro {$r->centro} Sector {$r->sector} | Clase {$r->clase} | Básico A01: $" . number_format($r->a01_basico, 2, ',', '.') . " | Radio A04: $" . number_format($r->a04_radio, 2, ',', '.') . " | Total Fila: $" . number_format($montoFila, 2, ',', '.') . PHP_EOL;
}

echo PHP_EOL . "SUMA TOTAL MONTO DE LA PERSONA: $" . number_format($totalMonto, 2, ',', '.') . PHP_EOL;

echo PHP_EOL . "==================================================" . PHP_EOL;
