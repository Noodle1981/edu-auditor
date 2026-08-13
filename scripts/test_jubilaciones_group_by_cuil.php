<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== ANÁLISIS DE PERSONAS ÚNICAS VS REGISTROS (POTENCIALES JUBILACIONES) ===" . PHP_EOL;

// Raw rows count
$totalRegistros = DB::table('nomina_sueldo_registros as n')
    ->whereNotNull('n.fecha_nacimiento')
    ->whereRaw("
        (
            (SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) IN ('27', '23', '24') AND (2026 - CAST(SUBSTR(n.fecha_nacimiento, 7, 4) AS INTEGER)) >= 57)
            OR
            (SUBSTR(REPLACE(n.cuil, '-', ''), 1, 2) NOT IN ('27', '23', '24') AND (2026 - CAST(SUBSTR(n.fecha_nacimiento, 7, 4) AS INTEGER)) >= 60)
            OR
            (n.antiguedad_anios >= 25)
        )
    ")->count();

// Unique CUIL count
$totalPersonas = DB::table('nomina_sueldo_registros as n')
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
    ->distinct()
    ->count('n.cuil');

echo "Total Registros de Liquidación: {$totalRegistros}" . PHP_EOL;
echo "Total Personas Únicas: {$totalPersonas}" . PHP_EOL;

echo PHP_EOL . "--- CASO CUIL: 27219433013 ---" . PHP_EOL;
$cuilTest = '27219433013';
$cargosTest = DB::table('nomina_sueldo_registros as n')
    ->leftJoin('depuracion_centros_sectores as d', function($j) {
        $j->on('d.centro', '=', 'n.centro')
          ->on('d.sector', '=', 'n.sector');
    })
    ->leftJoin('establecimientos as e', 'e.id', '=', 'd.establecimiento_id')
    ->where('n.cuil', 'like', "%{$cuilTest}%")
    ->select('n.*', 'd.nom_centro', 'd.nom_sector', 'd.nivel', 'd.gestion', 'e.cue as cue_vinculado', 'e.nombre as nom_escuela_vinculada')
    ->get();

echo "Registros para CUIL {$cuilTest}: " . $cargosTest->count() . PHP_EOL;
foreach ($cargosTest as $c) {
    echo "• Centro {$c->centro} Sector {$c->sector} ({$c->nom_sector}) | Clase {$c->clase} | Escuela: " . ($c->cue_vinculado ? "CUE {$c->cue_vinculado}" : "Sin vincular") . PHP_EOL;
}

echo PHP_EOL . "==================================================" . PHP_EOL;
