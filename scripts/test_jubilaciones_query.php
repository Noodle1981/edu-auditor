<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== PROBANDO QUERY DE POTENCIALES JUBILACIONES ===" . PHP_EOL;

$query = DB::table('nomina_sueldo_registros as n')
    ->leftJoin('depuracion_centros_sectores as d', function($j) {
        $j->on('d.centro', '=', 'n.centro')
          ->on('d.sector', '=', 'n.sector');
    })
    ->leftJoin('establecimientos as e', 'e.id', '=', 'd.establecimiento_id')
    ->leftJoin('jubilaciones_seguimiento as js', function($j) {
        $j->on('js.cuil', '=', 'n.cuil')
          ->on('js.centro', '=', 'n.centro')
          ->on('js.sector', '=', 'n.sector');
    })
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
    ->select(
        'n.id',
        'n.cuil',
        'n.apellido_nombre',
        'n.centro',
        'n.sector',
        'n.clase',
        'n.fecha_nacimiento',
        'n.antiguedad_anios',
        'd.nom_centro',
        'd.nom_sector',
        'd.nivel',
        'd.gestion',
        'e.cue as cue_vinculado',
        'e.nombre as nom_escuela_vinculada',
        DB::raw("COALESCE(js.estado_jubilacion, 'PENDIENTE') as estado_jubilacion"),
        'js.observaciones as observaciones_jubilacion',
        DB::raw("(2026 - CAST(SUBSTR(n.fecha_nacimiento, 7, 4) AS INTEGER)) as edad_calculada"),
        DB::raw("CASE WHEN SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) IN ('27', '23', '24') THEN 'F' ELSE 'M' END as genero_deducido")
    );

$totalCount = $query->count();
echo "Total de registros de sueldos en edad de jubilación: {$totalCount}" . PHP_EOL;

$sample = $query->limit(5)->get();
foreach ($sample as $s) {
    echo "• CUIL: {$s->cuil} | {$s->apellido_nombre} [{$s->genero_deducido}] | Edad: {$s->edad_calculada} años | Antigüedad: {$s->antiguedad_anios} años" . PHP_EOL;
    echo "  - Centro {$s->centro} ({$s->nom_centro}) | Sector {$s->sector} ({$s->nom_sector})" . PHP_EOL;
    echo "  - Escuela: " . ($s->cue_vinculado ? "CUE {$s->cue_vinculado} ({$s->nom_escuela_vinculada})" : "Sin Vincular") . PHP_EOL;
    echo "  - Estado Jubilación: {$s->estado_jubilacion}" . PHP_EOL;
    echo PHP_EOL;
}

echo PHP_EOL . "==================================================" . PHP_EOL;
