<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== PRUEBA DE QUERY AGRUPADO POR PERSONA (CUIL ÚNICO) ===" . PHP_EOL;

$query = DB::table('nomina_sueldo_registros as n')
    ->leftJoin('jubilaciones_seguimiento as js', 'js.cuil', '=', 'n.cuil')
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
        DB::raw("MAX(n.apellido_nombre) as apellido_nombre"),
        DB::raw("MAX(n.fecha_nacimiento) as fecha_nacimiento"),
        DB::raw("MAX(n.antiguedad_anios) as antiguedad_anios"),
        DB::raw("COUNT(n.id) as total_liquidaciones"),
        DB::raw("GROUP_CONCAT(DISTINCT n.centro) as centros_list"),
        DB::raw("GROUP_CONCAT(DISTINCT n.sector) as sectores_list"),
        DB::raw("COALESCE(MAX(js.estado_jubilacion), 'PENDIENTE') as estado_jubilacion"),
        DB::raw("MAX(js.observaciones) as observaciones_jubilacion"),
        DB::raw("(2026 - CAST(SUBSTR(MAX(n.fecha_nacimiento), 7, 4) AS INTEGER)) as edad_calculada"),
        DB::raw("CASE WHEN SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) IN ('27', '23', '24') THEN 'F' ELSE 'M' END as genero_deducido")
    );

$totalPersonas = DB::table(DB::raw("({$query->toSql()}) as sub"))
    ->mergeBindings($query)
    ->count();

echo "Total personas únicas filtradas: {$totalPersonas}" . PHP_EOL;

$sample = $query->limit(5)->get();
foreach ($sample as $s) {
    echo "• CUIL: {$s->cuil} | Nombre: {$s->apellido_nombre} [{$s->genero_deducido}]" . PHP_EOL;
    echo "  - Edad: {$s->edad_calculada} años | Antigüedad: {$s->antiguedad_anios} años" . PHP_EOL;
    echo "  - Liquidaciones: {$s->total_liquidaciones} cargos" . PHP_EOL;
    echo "  - Centros: {$s->centros_list} | Sectores: {$s->sectores_list}" . PHP_EOL;
    echo "  - Estado Jubilación: {$s->estado_jubilacion}" . PHP_EOL;
    echo PHP_EOL;
}

echo "==================================================" . PHP_EOL;
