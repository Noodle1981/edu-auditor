<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$cuil = '27219433013';
echo "=== PRUEBA DE DETALLE DE CARGOS DE PERSONA ({$cuil}) ===" . PHP_EOL;

$cargos = DB::table('nomina_sueldo_registros as n')
    ->leftJoin('depuracion_centros_sectores as d', function($j) {
        $j->on('d.centro', '=', 'n.centro')
          ->on('d.sector', '=', 'n.sector');
    })
    ->leftJoin('establecimientos as e', 'e.id', '=', 'd.establecimiento_id')
    ->where('n.cuil', 'like', "%{$cuil}%")
    ->select(
        'n.id',
        'n.cuil',
        'n.apellido_nombre',
        'n.centro',
        'n.sector',
        'n.clase',
        'n.zona',
        'n.a01_basico',
        'n.a04_radio',
        'n.porcentaje_calculado',
        'n.radio_deducido',
        'd.nom_centro',
        'd.nom_sector',
        'd.nivel',
        'd.gestion',
        'e.cue as cue_vinculado',
        'e.nombre as nom_escuela_vinculada'
    )
    ->get();

echo "Total liquidaciones de la persona: " . $cargos->count() . PHP_EOL;
foreach ($cargos as $c) {
    echo "• Centro {$c->centro} ({$c->nom_centro}) | Sector {$c->sector} ({$c->nom_sector}) | Nivel: {$c->nivel} | Clase {$c->clase} | Básico: $" . number_format($c->a01_basico, 2, ',', '.') . " | Escuela: " . ($c->cue_vinculado ? "CUE {$c->cue_vinculado} - {$c->nom_escuela_vinculada}" : "Sin vincular") . PHP_EOL;
}

echo PHP_EOL . "==================================================" . PHP_EOL;
