<?php

/**
 * ============================================================================
 * SCRIPT: Autocompletar Depuración – CENTROS SIN USO (CENTRO_SIN_USO)
 * ============================================================================
 *
 * OBJETIVO:
 *   Identifica y vincula los registros en la pestaña 'Centros sin uso'
 *   (estado_depuracion == 'CENTRO_SIN_USO', principalmente Centro 57 y 53).
 *
 * CRITERIOS ESTRICTOS:
 *   1. Registro sin vincular (establecimiento_id IS NULL) y estado 'CENTRO_SIN_USO'.
 *   2. EL ESTADO PERMANECE COMO 'CENTRO_SIN_USO' (NO se pasa a ACTIVO porque no tiene liquidaciones).
 *   3. Excluye JINZ / J.I.N.Z. / Inicial.
 *   4. Match por sector en SIGE contra 1 único candidato CUE. Si hay ambigüedad o múltiples
 *      CUEs, se omite para selección manual.
 * ============================================================================
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$dryRun = !in_array('--ejecutar', $argv ?? []);

$GREEN  = "\033[32m";
$YELLOW = "\033[33m";
$RED    = "\033[31m";
$CYAN   = "\033[36m";
$BOLD   = "\033[1m";
$RESET  = "\033[0m";

$vinculados   = 0;
$ambiguos     = 0;
$sinMatch     = 0;
$jinzSaltados = 0;

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  AUTOCOMPLETAR DEPURACIÓN – CENTROS SIN USO (CENTRO_SIN_USO){$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  ⚠  MODO DRY-RUN: No se realizarán cambios en la BD.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}     Para guardar, corré: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔  MODO EJECUCIÓN REAL – los cambios se guardarán.{$RESET}" . PHP_EOL;
}
echo PHP_EOL;

// Candidatos en depuración: sin vincular, estado 'CENTRO_SIN_USO'
$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'CENTRO_SIN_USO')
    ->orderBy('sector')
    ->orderBy('centro')
    ->get();

$total = $candidatos->count();
echo "{$CYAN}  Total registros en CENTRO_SIN_USO sin vincular: {$BOLD}{$total}{$RESET}" . PHP_EOL;
echo PHP_EOL;

foreach ($candidatos as $dep) {
    $nomUpper = mb_strtoupper($dep->nom_sector ?? '');
    
    // Omitir JINZ / Inicial
    if (str_contains($nomUpper, 'J.I.N') || str_contains($nomUpper, 'JINZ') || str_contains($nomUpper, 'J.I.N.Z') || str_contains($nomUpper, 'E.N.I')) {
        $jinzSaltados++;
        continue;
    }

    $sectorNum = (int) $dep->sector;

    // Buscar coincidencia por sector en SIGE
    $modalidades = DB::table('modalidades as m')
        ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
        ->whereNull('m.deleted_at')
        ->whereRaw("CAST(m.sector AS INTEGER) = ?", [$sectorNum])
        ->select(
            'm.id as modalidad_id',
            'm.establecimiento_id',
            'm.sector as m_sector',
            'm.nivel_educativo',
            'm.direccion_area',
            'm.radio_sige',
            'e.cue',
            'e.nombre as nom_establecimiento'
        )->get();

    $cantMatch = $modalidades->count();

    if ($cantMatch === 0) {
        $sinMatch++;
        continue;
    }

    if ($cantMatch > 1) {
        // Ambigüedad
        $ambiguos++;
        $cues = $modalidades->map(fn($m) => "CUE {$m->cue} ({$m->nom_establecimiento}) [{$m->direccion_area} - {$m->nivel_educativo}]")->implode(' | ');
        echo "  {$YELLOW}⚠ AMBIGUO{$RESET}   Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        echo "            Candidatos: {$cues}" . PHP_EOL;
        continue;
    }

    // Match 100% seguro y único
    $matchCandidato = $modalidades->first();
    $vinculados++;
    $obs = "[Auto-vinculado CENTRO_SIN_USO – Sector {$dep->sector} → CUE {$matchCandidato->cue} ({$matchCandidato->nivel_educativo})]";

    echo "  {$GREEN}✔ VINCULAR SEGURO{$RESET}    Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
    echo "            → {$matchCandidato->nom_establecimiento} (CUE: {$matchCandidato->cue}) [{$matchCandidato->nivel_educativo}] | Radio: R{$matchCandidato->radio_sige}" . PHP_EOL;

    if (!$dryRun) {
        DB::table('depuracion_centros_sectores')
            ->where('id', $dep->id)
            ->update([
                'establecimiento_id' => $matchCandidato->establecimiento_id,
                'modalidad_id'       => $matchCandidato->modalidad_id,
                'estado_depuracion'  => 'CENTRO_SIN_USO', // SE MANTIENE CENTRO_SIN_USO (NO PASA A ACTIVO)
                'observaciones'      => $obs,
                'updated_at'         => now(),
            ]);
    }
}

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  RESUMEN CENTROS SIN USO{$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "  Total examinados (CENTRO_SIN_USO) : {$total}" . PHP_EOL;
echo "  {$GREEN}✔ Vinculados (permanecen CENTRO_SIN_USO) : {$vinculados}{$RESET}" . PHP_EOL;
echo "  {$YELLOW}⚠ Ambiguos                         : {$ambiguos}{$RESET}" . PHP_EOL;
echo "  🔒 J.I.N.Z. omitidos               : {$jinzSaltados}" . PHP_EOL;
echo "  Sin match en SIGE                  : {$sinMatch}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  DRY-RUN finalizado. Ningún dato fue modificado.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}  Para ejecutar la vinculación real, usá: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔ Proceso completado. Se vincularon {$vinculados} registros de CENTRO_SIN_USO manteniéndolos en su pestaña.{$RESET}" . PHP_EOL;
}

echo PHP_EOL;
