<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== COMPARATIVA DE CONDICIÓN ANTERIOR (OR) VS NUEVA CONDICIÓN (AND) ===" . PHP_EOL;

// Condición Anterior (OR)
$queryOr = DB::table('nomina_sueldo_registros as n')
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

$totalOr = DB::table(DB::raw("({$queryOr->toSql()}) as sub"))->mergeBindings($queryOr)->count();
$conCobroOr = DB::table(DB::raw("({$queryOr->toSql()}) as sub"))->mergeBindings($queryOr)->where('total_monto', '>', 0)->count();
$sinCobroOr = DB::table(DB::raw("({$queryOr->toSql()}) as sub"))->mergeBindings($queryOr)->where('total_monto', '<=', 0)->count();

// Nueva Condición Estricta (AND): Edad para su género Y Antigüedad >= 25
$queryAnd = DB::table('nomina_sueldo_registros as n')
    ->whereNotNull('n.fecha_nacimiento')
    ->whereRaw("
        (
            (SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) IN ('27', '23', '24') AND (2026 - CAST(SUBSTR(n.fecha_nacimiento, 7, 4) AS INTEGER)) >= 57)
            OR
            (SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) NOT IN ('27', '23', '24') AND (2026 - CAST(SUBSTR(n.fecha_nacimiento, 7, 4) AS INTEGER)) >= 60)
        )
        AND (n.antiguedad_anios >= 25)
    ")
    ->groupBy('n.cuil')
    ->select(
        'n.cuil',
        DB::raw("SUM(COALESCE(n.a01_basico, 0) + COALESCE(n.a04_radio, 0)) as total_monto")
    );

$totalAnd = DB::table(DB::raw("({$queryAnd->toSql()}) as sub"))->mergeBindings($queryAnd)->count();
$conCobroAnd = DB::table(DB::raw("({$queryAnd->toSql()}) as sub"))->mergeBindings($queryAnd)->where('total_monto', '>', 0)->count();
$sinCobroAnd = DB::table(DB::raw("({$queryAnd->toSql()}) as sub"))->mergeBindings($queryAnd)->where('total_monto', '<=', 0)->count();

echo "• CONDICIÓN ANTERIOR (OR):" . PHP_EOL;
echo "  - Total Personas Únicas: {$totalOr}" . PHP_EOL;
echo "  - Con Cobro Activo ($ > 0): {$conCobroOr}" . PHP_EOL;
echo "  - Sin Cobro ($ = 0 / Residual): {$sinCobroOr}" . PHP_EOL;

echo PHP_EOL . "• NUEVA CONDICIÓN RESTRINGIDA (EDAD Y ANTIGÜEDAD >= 25):" . PHP_EOL;
echo "  - Total Personas Únicas: {$totalAnd}" . PHP_EOL;
echo "  - Con Cobro Activo ($ > 0): {$conCobroAnd}" . PHP_EOL;
echo "  - Sin Cobro ($ = 0 / Residual): {$sinCobroAnd}" . PHP_EOL;

echo PHP_EOL . "==================================================" . PHP_EOL;
