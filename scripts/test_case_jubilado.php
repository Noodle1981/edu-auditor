<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$dni = '16997691';
echo "==================================================" . PHP_EOL;
echo " ANÁLISIS DE CASO - DNI / CUIL: {$dni}" . PHP_EOL;
echo "==================================================" . PHP_EOL;

// 1. En nómina de sueldos
echo PHP_EOL . "1. REGISTRO EN LIQUIDACIÓN DE SUELDOS (Nómina Activa):" . PHP_EOL;
$sueldos = DB::table('nomina_sueldo_registros as n')
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

if ($sueldos->isEmpty()) {
    echo "  ✗ No registra liquidaciones en la nómina de sueldos activa." . PHP_EOL;
} else {
    foreach ($sueldos as $s) {
        echo "  • CUIL: {$s->cuil} | Nombre: {$s->apellido_nombre}" . PHP_EOL;
        echo "    - Centro: {$s->centro} (" . ($s->nom_centro ?? 'S/D') . ")" . PHP_EOL;
        echo "    - Sector: {$s->sector} (" . ($s->nom_sector ?? 'S/D') . ")" . PHP_EOL;
        echo "    - Nivel / Gestión: " . ($s->nivel ?? 'S/N') . " (" . ($s->gestion ?? 'S/G') . ")" . PHP_EOL;
        echo "    - Escuela Vinculada: " . ($s->cue_vinculado ? "CUE {$s->cue_vinculado} - {$s->nom_escuela_vinculada}" : "No vinculada") . PHP_EOL;
        echo "    - Cargo/Clase: {$s->clase} | Zona: {$s->zona} | Radio Cobrado: R" . ($s->radio_deducido ?? '1') . PHP_EOL;
        echo "    - Importe Básico A01: $" . number_format($s->a01_basico, 2, ',', '.') . " | Adicional Radio A04: $" . number_format($s->a04_radio, 2, ',', '.') . PHP_EOL;
    }
}

// 2. En Padrón de Agentes SIGE
echo PHP_EOL . "2. REGISTRO EN PADRÓN DE AGENTES Y DESIGNACIONES (SIGE):" . PHP_EOL;
$agente = DB::table('agentes')->where('dni', 'like', "%{$dni}%")->first();

if (!$agente) {
    echo "  ✗ No se encontró ficha de agente en la base SIGE." . PHP_EOL;
} else {
    echo "  • Agente SIGE ID: {$agente->id} | DNI: {$agente->dni} | Nombre: {$agente->nombre_agente} | Legajo: " . ($agente->legajo ?? 'S/L') . PHP_EOL;
    
    $designaciones = DB::table('designaciones as des')
        ->leftJoin('establecimientos as e', 'e.cue', '=', 'des.cue')
        ->where('des.dni', $agente->dni)
        ->select('des.*', 'e.nombre as nom_escuela_sige')
        ->get();

    if ($designaciones->isEmpty()) {
        echo "  • Estado en SIGE: SIN CARGOS ACTIVOS / DADO DE BAJA O JUBILADO (0 designaciones vigentes)" . PHP_EOL;
    } else {
        foreach ($designaciones as $d) {
            echo "  • Designación SIGE: CUE {$d->cue} (" . ($d->nom_escuela_sige ?? $d->establecimiento) . ") | Cargo: {$d->cargo_horas} | Revistal: {$d->situacion_revista} | Alta: {$d->fecha_alta}" . PHP_EOL;
        }
    }
}

// 3. Verificación en el Excel original para calcular Edad y Antigüedad
echo PHP_EOL . "3. DATOS EN EXCEL MINIMIZADO (Edad y Antigüedad):" . PHP_EOL;
$pythonCmd = 'python -c "import pandas as pd; df = pd.read_excel(\'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx\'); row = df[df[\'CUIL\'].astype(str).str.contains(\'' . $dni . '\')]; print(row[[\'APELLIDO Y NOMBRE\', \'CUIL\', \'FECHA DE NACIMIENTO\', \'ANTIGUEDAD\', \'CENTRO\', \'SECTOR\']].to_string())"';
exec($pythonCmd, $pyOutput);
foreach ($pyOutput as $line) {
    echo "  " . $line . PHP_EOL;
}

echo PHP_EOL . "==================================================" . PHP_EOL;
