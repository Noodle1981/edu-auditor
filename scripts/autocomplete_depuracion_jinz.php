<?php

/**
 * ============================================================================
 * SCRIPT: Autocompletar Depuración – J.I.N.Z. (Jardines Nucleados Zonales)
 * ============================================================================
 *
 * REGLA SOLICITADA POR EL USUARIO:
 *   Para los registros J.I.N.Z. (nivel PRIMARIA / gestión OFICIAL):
 *   1. Se busca el sector en las modalidades de SIGE.
 *   2. Se filtra para seleccionar ÚNICAMENTE la SEDE PRINCIPAL del J.I.N.Z.:
 *      - CUE terminado en '00' OR
 *      - Nombre del establecimiento que contenga la palabra 'SEDE'.
 *   3. Se ignoran los Anexos (ya que tienen sectores inconsistentes).
 *   4. Si hay una Sede Principal única, se vincula a ella.
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

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  AUTOCOMPLETAR DEPURACIÓN – J.I.N.Z. (SOLO SEDE PRINCIPAL){$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  ⚠  MODO DRY-RUN: No se realizarán cambios en la BD.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}     Para guardar, corré: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔  MODO EJECUCIÓN REAL – los cambios se guardarán.{$RESET}" . PHP_EOL;
}
echo PHP_EOL;

// Buscar candidatos JINZ sin vincular en depuración (PRIMARIA OFICIAL)
$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(nivel)) = 'PRIMARIA'")
    ->whereRaw("UPPER(TRIM(gestion)) = 'OFICIAL'")
    ->get()
    ->filter(function($d) {
        $nom = mb_strtoupper($d->nom_sector ?? '');
        return str_contains($nom, 'J.I.N') || str_contains($nom, 'JINZ') || str_contains($nom, 'J.I.N.Z');
    });

$total = $candidatos->count();
echo "{$CYAN}  Candidatos J.I.N.Z. sin vincular a examinar: {$BOLD}{$total}{$RESET}" . PHP_EOL;
echo PHP_EOL;

foreach ($candidatos as $dep) {
    $sectorNum = (int) $dep->sector;

    // Buscar modalidades de SIGE con este sector
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
        )
        ->get();

    if ($modalidades->count() === 0) {
        $sinMatch++;
        continue;
    }

    // Filtrar candidatos para encontrar la SEDE PRINCIPAL (CUE termina en 00 o Nombre contiene 'SEDE')
    $sedes = $modalidades->filter(function($m) {
        $cueStr = (string) $m->cue;
        $nomUpper = mb_strtoupper($m->nom_establecimiento);
        return str_ends_with($cueStr, '00') || str_contains($nomUpper, 'SEDE');
    });

    if ($sedes->count() === 0) {
        // Ninguna de las opciones es declarada Sede
        $ambiguos++;
        $cues = $modalidades->map(fn($m) => "CUE {$m->cue} ({$m->nom_establecimiento})")->implode(' | ');
        echo "  {$YELLOW}⚠ SIN SEDE DECLARADA{$RESET} Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        echo "            Candidatos: {$cues}" . PHP_EOL;
        continue;
    }

    if ($sedes->count() > 1) {
        // Hay más de 1 Sede con el mismo sector -> ambigüedad
        $ambiguos++;
        $cues = $sedes->map(fn($m) => "CUE {$m->cue} ({$m->nom_establecimiento})")->implode(' | ');
        echo "  {$YELLOW}⚠ MÚLTIPLES SEDES{$RESET}  Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        echo "            Sedes: {$cues}" . PHP_EOL;
        continue;
    }

    // Sede Principal Única confirmada
    $matchSede = $sedes->first();
    $vinculados++;
    $obs = "[Auto-vinculado J.I.N.Z. SEDE – Sector {$dep->sector} → CUE {$matchSede->cue} ({$matchSede->nom_establecimiento})]";

    echo "  {$GREEN}✔ VINCULAR SEDE JINZ{$RESET} Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
    echo "            → {$matchSede->nom_establecimiento} (CUE: {$matchSede->cue}) [{$matchSede->nivel_educativo}] | Radio: R{$matchSede->radio_sige}" . PHP_EOL;

    if (!$dryRun) {
        DB::table('depuracion_centros_sectores')
            ->where('id', $dep->id)
            ->update([
                'establecimiento_id' => $matchSede->establecimiento_id,
                'modalidad_id'       => $matchSede->modalidad_id,
                'observaciones'      => $obs,
                'updated_at'         => now(),
            ]);
    }
}

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  RESUMEN J.I.N.Z. (SOLO SEDES PRINCIPALES){$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "  Total examinados (JINZ)       : {$total}" . PHP_EOL;
echo "  {$GREEN}✔ Sedes Vinculadas Exitosas   : {$vinculados}{$RESET}" . PHP_EOL;
echo "  {$YELLOW}⚠ Ambiguos / Múltiples Sedes  : {$ambiguos}{$RESET}" . PHP_EOL;
echo "  Sin match en SIGE             : {$sinMatch}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  DRY-RUN finalizado. Ningún dato fue modificado.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}  Para ejecutar la vinculación real, usá: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔ Proceso completado. Se vincularon {$vinculados} Sedes de J.I.N.Z.{$RESET}" . PHP_EOL;
}

echo PHP_EOL;
