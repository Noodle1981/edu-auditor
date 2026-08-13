<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$dni = '27527620';
echo "=== DETALLE DE AFECTACIÓN DNI / CUIL: 27527620 ===" . PHP_EOL;

// 1. Nómina de sueldos
$registrosSueldo = DB::table('nomina_sueldo_registros as n')
    ->leftJoin('depuracion_centros_sectores as d', function($j) {
        $j->on('d.centro', '=', 'n.centro')
          ->on('d.sector', '=', 'n.sector');
    })
    ->leftJoin('establecimientos as e', 'e.id', '=', 'd.establecimiento_id')
    ->where('n.cuil', 'like', "%{$dni}%")
    ->select(
        'n.*',
        'd.nom_centro',
        'd.nom_sector',
        'd.nivel',
        'd.gestion',
        'd.estado_depuracion',
        'e.cue as cue_vinculado',
        'e.nombre as nom_escuela_vinculada'
    )
    ->get();

echo PHP_EOL . "--- En Liquidación de Sueldos (Nómina Activa) ---" . PHP_EOL;
foreach ($registrosSueldo as $r) {
    echo "• CUIL: {$r->cuil} | Nombre: {$r->apellido_nombre}" . PHP_EOL;
    echo "  - Centro: {$r->centro} (" . ($r->nom_centro ?? 'S/D') . ")" . PHP_EOL;
    echo "  - Sector: {$r->sector} (" . ($r->nom_sector ?? 'S/D') . ")" . PHP_EOL;
    echo "  - Nivel en Sueldos: " . ($r->nivel ?? 'S/N') . " | Gestión: " . ($r->gestion ?? 'S/G') . PHP_EOL;
    echo "  - Estado del Sector en Depuración: " . ($r->estado_depuracion ?? 'S/D') . PHP_EOL;
    echo "  - Escuela Vinculada en Depuración: " . ($r->cue_vinculado ? "CUE {$r->cue_vinculado} - {$r->nom_escuela_vinculada}" : "No vinculada (Sin CUE)") . PHP_EOL;
    echo "  - Cargo/Clase: {$r->clase} | Zona Liquidada: {$r->zona} | Radio Cobrado: R" . ($r->radio_deducido ?? '1') . PHP_EOL;
    echo "  - Importe Básico A01: $" . number_format($r->a01_basico, 2, ',', '.') . " | Adicional Radio A04: $" . number_format($r->a04_radio, 2, ',', '.') . PHP_EOL;
    echo PHP_EOL;
}

// 2. Búsqueda en SIGE / Agentes / Designaciones
$agentes = DB::table('agentes')
    ->where('dni', 'like', "%{$dni}%")
    ->get();

if ($agentes->isNotEmpty()) {
    echo "--- Encontrado en Base SIGE (Agente Padrón) ---" . PHP_EOL;
    foreach ($agentes as $a) {
        echo "• Agente SIGE ID: {$a->id} | DNI: {$a->dni} | Nombre: {$a->nombre_agente}" . PHP_EOL;
        
        $designaciones = DB::table('designaciones as des')
            ->leftJoin('establecimientos as e', 'e.cue', '=', 'des.cue')
            ->leftJoin('modalidades as m', 'm.establecimiento_id', '=', 'e.id')
            ->where('des.dni', $a->dni)
            ->select('des.*', 'e.nombre as nom_escuela_sige', 'm.sector as sector_sige', 'm.nivel_educativo', 'm.direccion_area')
            ->distinct()
            ->get();

        if ($designaciones->isNotEmpty()) {
            foreach ($designaciones as $d) {
                echo "  - Designación SIGE: CUE {$d->cue} (" . ($d->nom_escuela_sige ?? $d->establecimiento) . ") | Cargo: {$d->cargo_horas} | Revistal: {$d->situacion_revista} | Área SIGE: {$d->direccion_area} | Nivel SIGE: {$d->nivel_educativo}" . PHP_EOL;
            }
        } else {
            echo "  - No posee cargos o escuelas asignadas registradas en la tabla de designaciones SIGE." . PHP_EOL;
        }
    }
}

echo PHP_EOL . "==================================================" . PHP_EOL;
