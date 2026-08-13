<?php

/**
 * ============================================================================
 * SCRIPT: Autocompletar Depuración – ENSEÑANZA PRIVADA (Paso 6)
 * ============================================================================
 *
 * OBJETIVO:
 *   Vincula automáticamente registros de `depuracion_centros_sectores` en estado
 *   ACTIVO y sin vincular, correspondientes a ENSEÑANZA PRIVADA.
 *
 * CRITERIOS ESTRICTOS:
 *   1. Registro sin vincular (establecimiento_id IS NULL) y estado ACTIVO.
 *   2. Gestión PRIVADA únicamente.
 *   3. Excluye JINZ / J.I.N.Z. / Inicial.
 *   4. Match en modalidades SIGE de Área PRIVADA (m.direccion_area == 'PRIVADA').
 *   5. REGLA CLAVE: Si la escuela/CUE tiene MÁS DE 1 NIVEL cargado en SIGE,
 *      o si hay más de 1 CUE candidato, SE OMITE PARA SELECCIÓN MANUAL.
 *   6. Solo vincula cuando el CUE tiene EXACTAMENTE 1 solo nivel registrado.
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
$multiNivel   = 0;
$ambiguos     = 0;
$sinMatch     = 0;
$jinzSaltados = 0;

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  AUTOCOMPLETAR DEPURACIÓN – ENSEÑANZA PRIVADA (Paso 6){$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  ⚠  MODO DRY-RUN: No se realizarán cambios en la BD.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}     Para guardar, corré: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔  MODO EJECUCIÓN REAL – los cambios se guardarán.{$RESET}" . PHP_EOL;
}
echo PHP_EOL;

// Candidatos en depuración: sin vincular, ACTIVO, gestión PRIVADA
$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(gestion)) = 'PRIVADA'")
    ->orderBy('sector')
    ->orderBy('centro')
    ->get();

$total = $candidatos->count();
echo "{$CYAN}  Candidatos PRIVADA sin vincular a examinar: {$BOLD}{$total}{$RESET}" . PHP_EOL;
echo PHP_EOL;

foreach ($candidatos as $dep) {
    $nomUpper = mb_strtoupper($dep->nom_sector ?? '');
    
    // Omitir JINZ / Inicial
    if (str_contains($nomUpper, 'J.I.N') || str_contains($nomUpper, 'JINZ') || str_contains($nomUpper, 'J.I.N.Z') || str_contains($nomUpper, 'E.N.I')) {
        $jinzSaltados++;
        continue;
    }

    $sectorNum = (int) $dep->sector;

    // Buscar modalidades de ÁREA PRIVADA en SIGE con este sector
    $modalidades = DB::table('modalidades as m')
        ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
        ->whereNull('m.deleted_at')
        ->where('m.direccion_area', 'PRIVADA')
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
        )
        ->get();

    $cantMatch = $modalidades->count();

    if ($cantMatch === 0) {
        $sinMatch++;
        continue;
    }

    if ($cantMatch > 1) {
        // Múltiples CUEs candidatos para el mismo sector en Privada
        $ambiguos++;
        $cues = $modalidades->map(fn($m) => "CUE {$m->cue} ({$m->nom_establecimiento}) [{$m->nivel_educativo}]")->implode(' | ');
        echo "  {$YELLOW}⚠ AMBIGUO (Varios CUEs){$RESET} Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        echo "            Candidatos: {$cues}" . PHP_EOL;
        continue;
    }

    // Match único de CUE. Ahora verificamos si ese CUE tiene más de 1 nivel en SIGE
    $matchCandidato = $modalidades->first();
    
    $totalNivelesCUE = DB::table('modalidades')
        ->where('establecimiento_id', $matchCandidato->establecimiento_id)
        ->whereNull('deleted_at')
        ->count();

    if ($totalNivelesCUE > 1) {
        // El CUE tiene múltiples niveles (ej. Inicial + Primario + Secundario) -> DESCHARTAR PARA MANUAL
        $multiNivel++;
        echo "  {$YELLOW}⚠ MULTINIVEL (A mano){$RESET}   Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        echo "            → CUE {$matchCandidato->cue} ({$matchCandidato->nom_establecimiento}) tiene {$totalNivelesCUE} niveles en SIGE" . PHP_EOL;
        continue;
    }

    // CUE con EXACTAMENTE 1 nivel registrado en SIGE -> Vincular de forma segura
    $vinculados++;
    $obs = "[Auto-vinculado PRIVADA – Sector {$dep->sector} → CUE {$matchCandidato->cue} ({$matchCandidato->nivel_educativo})]";

    echo "  {$GREEN}✔ VINCULAR SEGURO{$RESET}    Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
    echo "            → {$matchCandidato->nom_establecimiento} (CUE: {$matchCandidato->cue}) [{$matchCandidato->nivel_educativo}] | Radio: R{$matchCandidato->radio_sige}" . PHP_EOL;

    if (!$dryRun) {
        DB::table('depuracion_centros_sectores')
            ->where('id', $dep->id)
            ->update([
                'establecimiento_id' => $matchCandidato->establecimiento_id,
                'modalidad_id'       => $matchCandidato->modalidad_id,
                'observaciones'      => $obs,
                'updated_at'         => now(),
            ]);
    }
}

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  RESUMEN ENSEÑANZA PRIVADA (Paso 6){$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "  Total examinados sin vincular : {$total}" . PHP_EOL;
echo "  {$GREEN}✔ Vinculados 100% seguros (1 nivel) : {$vinculados}{$RESET}" . PHP_EOL;
echo "  {$YELLOW}⚠ Multinivel (omiti a mano)        : {$multiNivel}{$RESET}" . PHP_EOL;
echo "  {$YELLOW}⚠ Ambiguos (varios CUEs)            : {$ambiguos}{$RESET}" . PHP_EOL;
echo "  🔒 J.I.N.Z. omitidos                : {$jinzSaltados}" . PHP_EOL;
echo "  Sin match en PRIVADA                : {$sinMatch}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  DRY-RUN finalizado. Ningún dato fue modificado.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}  Para ejecutar la vinculación real, usá: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔ Proceso completado. Se vincularon {$vinculados} registros de PRIVADA.{$RESET}" . PHP_EOL;
}

echo PHP_EOL;
