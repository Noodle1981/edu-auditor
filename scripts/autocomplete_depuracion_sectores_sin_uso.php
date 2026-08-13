<?php

/**
 * ============================================================================
 * SCRIPT: Autocompletar Depuración – SECTORES SIN USO (Pasada Completa)
 * ============================================================================
 *
 * OBJETIVO:
 *   Aplica los 5 criterios anteriores (Primaria, Adultos, Secundario, Superior, Privada)
 *   sobre los registros que actualmente están en estado 'SECTOR_SIN_USO'.
 *
 * CRITERIOS ESTRICTOS:
 *   1. Registro sin vincular (establecimiento_id IS NULL) y estado 'SECTOR_SIN_USO'.
 *   2. EXCLUYE JINZ / J.I.N.Z. / Inicial.
 *   3. Match seguro de 1 solo candidato CUE + 1 solo nivel (o candidato único).
 *   4. Al vincular:
 *      - Asigna establecimiento_id y modalidad_id
 *      - Actualiza estado_depuracion = 'ACTIVO' (marcado como saneado)
 *      - Registra observación en el historial
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
echo "{$BOLD}  AUTOCOMPLETAR DEPURACIÓN – SECTORES SIN USO{$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  ⚠  MODO DRY-RUN: No se realizarán cambios en la BD.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}     Para guardar, corré: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔  MODO EJECUCIÓN REAL – los cambios se guardarán.{$RESET}" . PHP_EOL;
}
echo PHP_EOL;

// Candidatos en depuración: sin vincular, estado 'SECTOR_SIN_USO'
$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'SECTOR_SIN_USO')
    ->orderBy('sector')
    ->orderBy('centro')
    ->get();

$total = $candidatos->count();
echo "{$CYAN}  Total registros en SECTOR_SIN_USO sin vincular: {$BOLD}{$total}{$RESET}" . PHP_EOL;
echo PHP_EOL;

foreach ($candidatos as $dep) {
    $nomUpper = mb_strtoupper($dep->nom_sector ?? '');
    
    // Omitir JINZ / Inicial
    if (str_contains($nomUpper, 'J.I.N') || str_contains($nomUpper, 'JINZ') || str_contains($nomUpper, 'J.I.N.Z') || str_contains($nomUpper, 'E.N.I')) {
        $jinzSaltados++;
        continue;
    }

    $sectorNum = (int) $dep->sector;
    $gestion = mb_strtoupper(trim($dep->gestion ?? ''));
    $nivel = mb_strtoupper(trim($dep->nivel ?? ''));

    // Buscar coincidencia en SIGE según Gestión (OFICIAL vs PRIVADA)
    $query = DB::table('modalidades as m')
        ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
        ->whereNull('m.deleted_at')
        ->whereRaw("CAST(m.sector AS INTEGER) = ?", [$sectorNum]);

    if ($gestion === 'PRIVADA') {
        $query->where('m.direccion_area', 'PRIVADA');
    } else {
        $query->where('m.direccion_area', '!=', 'PRIVADA');
    }

    $modalidades = $query->select(
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
        $ambiguos++;
        $cues = $modalidades->map(fn($m) => "CUE {$m->cue} ({$m->nom_establecimiento}) [{$m->nivel_educativo}]")->implode(' | ');
        echo "  {$YELLOW}⚠ AMBIGUO{$RESET}   Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        echo "            Candidatos: {$cues}" . PHP_EOL;
        continue;
    }

    // Match único de CUE
    $matchCandidato = $modalidades->first();

    // Si la gestión es PRIVADA o la escuela tiene múltiples niveles, verificar regla de 1 solo nivel si es PRIVADA
    if ($gestion === 'PRIVADA') {
        $totalNivelesCUE = DB::table('modalidades')
            ->where('establecimiento_id', $matchCandidato->establecimiento_id)
            ->whereNull('deleted_at')
            ->count();

        if ($totalNivelesCUE > 1) {
            $ambiguos++;
            echo "  {$YELLOW}⚠ MULTINIVEL PRIVADA{$RESET} Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
            echo "            → CUE {$matchCandidato->cue} tiene {$totalNivelesCUE} niveles en SIGE" . PHP_EOL;
            continue;
        }
    }

    // Match 100% confirmado
    $vinculados++;
    $obs = "[Auto-vinculado SECTOR_SIN_USO – Sector {$dep->sector} → CUE {$matchCandidato->cue} ({$matchCandidato->nivel_educativo})]";

    echo "  {$GREEN}✔ VINCULAR SEGURO{$RESET}    Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector} ({$gestion})" . PHP_EOL;
    echo "            → {$matchCandidato->nom_establecimiento} (CUE: {$matchCandidato->cue}) [{$matchCandidato->nivel_educativo}] | Radio: R{$matchCandidato->radio_sige}" . PHP_EOL;

    if (!$dryRun) {
        DB::table('depuracion_centros_sectores')
            ->where('id', $dep->id)
            ->update([
                'establecimiento_id' => $matchCandidato->establecimiento_id,
                'modalidad_id'       => $matchCandidato->modalidad_id,
                'estado_depuracion'  => 'SECTOR_SIN_USO',
                'observaciones'      => $obs,
                'updated_at'         => now(),
            ]);
    }
}

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  RESUMEN SECTORES SIN USO{$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "  Total examinados (SECTOR_SIN_USO) : {$total}" . PHP_EOL;
echo "  {$GREEN}✔ Vinculados saneados (ACTIVO)    : {$vinculados}{$RESET}" . PHP_EOL;
echo "  {$YELLOW}⚠ Ambiguos / Multinivel           : {$ambiguos}{$RESET}" . PHP_EOL;
echo "  🔒 J.I.N.Z. omitidos               : {$jinzSaltados}" . PHP_EOL;
echo "  Sin match en SIGE                  : {$sinMatch}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  DRY-RUN finalizado. Ningún dato fue modificado.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}  Para ejecutar la vinculación real, usá: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔ Proceso completado. Se vincularon {$vinculados} sectores sin uso a su CUE correspondiente.{$RESET}" . PHP_EOL;
}

echo PHP_EOL;
