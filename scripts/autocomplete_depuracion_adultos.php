<?php

/**
 * ============================================================================
 * SCRIPT: Autocompletar Depuración – DIRECCIÓN DE ÁREA ADULTOS (Paso 2)
 * ============================================================================
 *
 * OBJETIVO:
 *   Vincula automáticamente registros de `depuracion_centros_sectores` en estado
 *   ACTIVO y sin vincular, cuyos sectores corresponden a la Dirección de Área ADULTOS
 *   en el catálogo oficial SIGE (ej. UEPA, CENS, PROPAA).
 *
 * REGLAS ESTRUCTURALES:
 *   1. Registro sin vincular (establecimiento_id IS NULL) y estado ACTIVO.
 *   2. EXCLUIR explícitamente J.I.N.Z. / JINZ / Inicial (casos especiales).
 *   3. Match contra modalidades SIGE de Dirección de Área ADULTOS (UEPA, CENS, PROPAA).
 *   4. Único candidato posible (sin ambigüedad).
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

$vinculados = 0;
$ambiguos   = 0;
$sinMatch   = 0;
$jinzSaltados = 0;

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  AUTOCOMPLETAR DEPURACIÓN – DIRECCIÓN DE ÁREA ADULTOS (Paso 2){$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  ⚠  MODO DRY-RUN: No se realizarán cambios en la BD.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}     Para guardar, corré: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔  MODO EJECUCIÓN REAL – los cambios se guardarán.{$RESET}" . PHP_EOL;
}
echo PHP_EOL;

// Buscar candidatos sin vincular en depuración (PRIMARIA OFICIAL)
$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(nivel)) = 'PRIMARIA'")
    ->whereRaw("UPPER(TRIM(gestion)) = 'OFICIAL'")
    ->orderBy('sector')
    ->orderBy('centro')
    ->get();

$total = $candidatos->count();
echo "{$CYAN}  Candidatos a revisar (PRIMARIA OFICIAL sin vincular): {$BOLD}{$total}{$RESET}" . PHP_EOL;
echo PHP_EOL;

$logAmbiguos = [];

foreach ($candidatos as $dep) {
    $nomUpper = mb_strtoupper($dep->nom_sector ?? '');
    
    // EXCLUSIÓN SEGURA: Si es J.I.N.Z., JINZ o N.I.Z., se omite por indicación del usuario
    if (str_contains($nomUpper, 'J.I.N') || str_contains($nomUpper, 'JINZ') || str_contains($nomUpper, 'J.I.N.Z') || str_contains($nomUpper, 'E.N.I')) {
        $jinzSaltados++;
        continue;
    }

    $sectorNum = (int) $dep->sector;

    // Buscar modalidades de ADULTOS (UEPA, CENS, PROPAA, ADULTOS) en SIGE con este sector
    $modalidades = DB::table('modalidades as m')
        ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
        ->whereNull('m.deleted_at')
        ->whereRaw("CAST(m.sector AS INTEGER) = ?", [$sectorNum])
        ->where(function($q) {
            $q->where('m.direccion_area', 'ADULTOS')
              ->orWhereIn('m.nivel_educativo', ['UEPA', 'CENS', 'PROPAA', 'ADULTOS']);
        })
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
        // Ambigüedad: más de 1 candidato
        $ambiguos++;
        $cues = $modalidades->map(fn($m) => "CUE {$m->cue} ({$m->nom_establecimiento}) [{$m->nivel_educativo}]")->implode(' | ');
        $logAmbiguos[] = [
            'id' => $dep->id,
            'centro' => $dep->centro,
            'sector' => $dep->sector,
            'nom_sector' => $dep->nom_sector,
            'candidatos' => $cues,
        ];
        echo "  {$YELLOW}⚠ AMBIGUO{$RESET}   Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        echo "            Candidatos: {$cues}" . PHP_EOL;
        continue;
    }

    // Match único confirmado
    $matchFinal = $modalidades->first();
    $vinculados++;
    $obs = "[Auto-vinculado ADULTOS – Sector {$dep->sector} → CUE {$matchFinal->cue} ({$matchFinal->nivel_educativo})]";

    echo "  {$GREEN}✔ VINCULAR{$RESET}   Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
    echo "            → {$matchFinal->nom_establecimiento} (CUE: {$matchFinal->cue}) [{$matchFinal->nivel_educativo}] | Radio: R{$matchFinal->radio_sige}" . PHP_EOL;

    if (!$dryRun) {
        DB::table('depuracion_centros_sectores')
            ->where('id', $dep->id)
            ->update([
                'establecimiento_id' => $matchFinal->establecimiento_id,
                'modalidad_id'       => $matchFinal->modalidad_id,
                'observaciones'      => $obs,
                'updated_at'         => now(),
            ]);
    }
}

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  RESUMEN ADULTOS{$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "  Total examinados             : {$total}" . PHP_EOL;
echo "  {$GREEN}✔ Vinculados seguros (ADULTOS): {$vinculados}{$RESET}" . PHP_EOL;
echo "  {$YELLOW}⚠ Ambiguos                  : {$ambiguos}{$RESET}" . PHP_EOL;
echo "  {$CYAN}🔒 J.I.N.Z. omitidos (manual): {$jinzSaltados}{$RESET}" . PHP_EOL;
echo "  Sin match en Dirección ADULTOS : {$sinMatch}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  DRY-RUN finalizado. Ningún dato fue modificado.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}  Para ejecutar la vinculación real, usá: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔ Proceso completado. Se vincularon {$vinculados} registros de ADULTOS.{$RESET}" . PHP_EOL;
}

echo PHP_EOL;
