<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== ANÁLISIS DE PERSONAS CON COBRO ($ > 0) VS SIN COBRO ($ = 0) ===" . PHP_EOL;

$query = DB::table('nomina_sueldo_registros as n')
    ->whereNotNull('n.fecha_nacimiento')
    ->whereRaw("
        (
            (SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) IN ('27', '23', '24') AND (2026 - CAST(SUBSTR(n.fecha_nacimiento, 7, 4) AS INTEGER)) >= 57)
            OR
            (SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) NOT IN ('27', '23', '24') AND (2026 - CAST(SUBSTR(n.fecha_nacimiento, 7, 4) AS INTEGER)) >= 60)
            OR
            (n.antiguedad_anios >= 25)
        )
    ")
    ->groupBy('n.cuil')
    ->select(
        'n.cuil',
        DB::raw("SUM(COALESCE(n.a01_basico, 0) + COALESCE(n.a04_radio, 0)) as total_monto")
    );

$personasWithCobro = DB::table(DB::raw("({$query->toSql()}) as sub"))
    ->mergeBindings($query)
    ->where('total_monto', '>', 0)
    ->count();

$personasSinCobro = DB::table(DB::raw("({$query->toSql()}) as sub"))
    ->mergeBindings($query)
    ->where('total_monto', '<=', 0)
    ->count();

echo "• Total Personas Únicas: 4615" . PHP_EOL;
echo "  - 💵 Con Cobro Activo ($ > 0): {$personasWithCobro} personas" . PHP_EOL;
echo "  - ⚪ Sin Cobro ($ = 0 / Residual): {$personasSinCobro} personas" . PHP_EOL;

echo PHP_EOL . "==================================================" . PHP_EOL;
