<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== VERIFICACIÓN DE FECHA NACIMIENTO Y ANTIGÜEDAD EN BD ===" . PHP_EOL;

$totalPoblados = DB::table('nomina_sueldo_registros')
    ->whereNotNull('fecha_nacimiento')
    ->count();

echo "Total registros en nomina_sueldo_registros con Fecha Nacimiento: {$totalPoblados}" . PHP_EOL;

$sample = DB::table('nomina_sueldo_registros')
    ->whereNotNull('fecha_nacimiento')
    ->select('cuil', 'apellido_nombre', 'fecha_nacimiento', 'antiguedad_anios', 'centro', 'sector')
    ->limit(5)
    ->get();

foreach ($sample as $s) {
    echo "• CUIL: {$s->cuil} | {$s->apellido_nombre} | F.Nac: {$s->fecha_nacimiento} | Antigüedad: " . ($s->antiguedad_anios ?? 'S/D') . " años | Centro {$s->centro} Sector {$s->sector}" . PHP_EOL;
}

echo PHP_EOL . "==================================================" . PHP_EOL;
