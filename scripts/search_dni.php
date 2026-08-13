<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$dni = '27527620';
echo "=== BÚSQUEDA DE DNI / CUIL: {$dni} ===" . PHP_EOL;

// 1. En nomina_sueldo_registros
echo PHP_EOL . "--- En Nómina de Sueldos (nomina_sueldo_registros) ---" . PHP_EOL;
$registrosSueldo = DB::table('nomina_sueldo_registros as n')
    ->leftJoin('depuracion_centros_sectores as d', function($j) {
        $j->on('d.centro', '=', 'n.centro')
          ->on('d.sector', '=', 'n.sector');
    })
    ->leftJoin('establecimientos as e', 'e.id', '=', 'd.establecimiento_id')
    ->where('n.cuil', 'like', "%{$dni}%")
    ->orWhere('n.cuil', 'like', "%27527620%")
    ->select(
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
        'd.estado_depuracion',
        'e.cue as cue_vinculado',
        'e.nombre as nom_escuela_vinculada'
    )
    ->get();

if ($registrosSueldo->isEmpty()) {
    echo "No se encontraron liquidaciones de sueldos directamente con '{$dni}'." . PHP_EOL;
} else {
    foreach ($registrosSueldo as $r) {
        echo "• CUIL: {$r->cuil} | Agente: {$r->apellido_nombre}" . PHP_EOL;
        echo "  - Centro: {$r->centro} (" . ($r->nom_centro ?? 'S/D') . ")" . PHP_EOL;
        echo "  - Sector: {$r->sector} (" . ($r->nom_sector ?? 'S/D') . ")" . PHP_EOL;
        echo "  - Nivel / Gestión: " . ($r->nivel ?? 'S/N') . " (" . ($r->gestion ?? 'S/G') . ")" . PHP_EOL;
        echo "  - Estado Depuración: " . ($r->estado_depuracion ?? 'S/D') . PHP_EOL;
        echo "  - Escuela Vinculada: " . ($r->cue_vinculado ? "CUE {$r->cue_vinculado} - {$r->nom_escuela_vinculada}" : "No vinculada") . PHP_EOL;
        echo "  - Clase: {$r->clase} | Zona: {$r->zona} | Radio Cobrado: R" . ($r->radio_deducido ?? 'S/D') . PHP_EOL;
        echo PHP_EOL;
    }
}

// 2. En tabla de Agentes (SIGE)
echo "--- En Agentes SIGE (agentes) ---" . PHP_EOL;
$agentes = DB::table('agentes')
    ->where('dni', 'like', "%{$dni}%")
    ->orWhere('cuil', 'like', "%{$dni}%")
    ->get();

if ($agentes->isEmpty()) {
    echo "No se encontró ficha de agente SIGE con DNI {$dni}." . PHP_EOL;
} else {
    foreach ($agentes as $a) {
        echo "• ID: {$a->id} | DNI: {$a->dni} | CUIL: {$a->cuil} | Nombre: {$a->apellido_nombre}" . PHP_EOL;
        
        // Buscar cargos o designaciones
        $cargos = DB::table('agente_cargos as ac')
            ->leftJoin('establecimientos as e', 'e.id', '=', 'ac.establecimiento_id')
            ->leftJoin('modalidades as m', 'm.id', '=', 'ac.modalidad_id')
            ->where('ac.agente_id', $a->id)
            ->select('ac.*', 'e.cue', 'e.nombre as nom_escuela', 'm.sector as sector_sige', 'm.nivel_educativo')
            ->get();

        foreach ($cargos as $c) {
            echo "  - Cargo SIGE: {$c->cargo} | Escuela: CUE {$c->cue} ({$c->nom_escuela}) | Sector SIGE: {$c->sector_sige} [{$c->nivel_educativo}]" . PHP_EOL;
        }
    }
}

// 3. Búsqueda amplia por patrón si no hubo resultados directos
if ($registrosSueldo->isEmpty() && $agentes->isEmpty()) {
    echo PHP_EOL . "--- Búsqueda general por partes del número ---" . PHP_EOL;
    $numClean = preg_replace('/[^0-9]/', '', $dni);
    $broad = DB::table('nomina_sueldo_registros')
        ->where('cuil', 'like', "%{$numClean}%")
        ->get();
    echo "Encontrados por búsqueda amplia: " . $broad->count() . PHP_EOL;
    foreach ($broad as $b) {
        echo "• CUIL: {$b->cuil} | {$b->apellido_nombre} | Centro: {$b->centro} | Sector: {$b->sector}" . PHP_EOL;
    }
}

echo PHP_EOL . "==================================================" . PHP_EOL;
