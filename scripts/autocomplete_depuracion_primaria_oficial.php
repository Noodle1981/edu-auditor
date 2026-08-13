<?php

/**
 * ============================================================================
 * SCRIPT: Autocompletar Depuración – PRIMARIA OFICIAL (paso 1 de N)
 * ============================================================================
 *
 * OBJETIVO:
 *   Vincula automáticamente registros de `depuracion_centros_sectores` que
 *   estén en estado ACTIVO y sin establecimiento, aplicando las siguientes
 *   condiciones estrictas:
 *
 *   CONDICIÓN 1 — Nivel/Gestión de la depuración:
 *     d.nivel = 'PRIMARIA'  AND  d.gestion = 'OFICIAL'
 *
 *   CONDICIÓN 2 — Match por sector nativo:
 *     Existe exactamente UNA modalidad cuyo campo `sector` (cast int)
 *     coincide con d.sector, y esa modalidad pertenece a un establecimiento
 *     que tiene UN SOLO nivel (una única modalidad activa).
 *
 *   CONDICIÓN 3 — Nivel en SIGE coincide:
 *     La modalidad encontrada tiene nivel_educativo IN ('PRIMARIO','ALBERGUE')
 *     y direccion_area = 'PRIMARIO'
 *
 *   Si se cumplen las 3 condiciones → vincula establecimiento_id + modalidad_id
 *   Si hay ambigüedad o no hay match → lo lista como PENDIENTE (no toca nada)
 *
 * MODO DRY-RUN:
 *   Por defecto el script corre en DRY-RUN (solo muestra qué haría, no guarda).
 *   Para ejecutar cambios reales: php scripts/autocomplete_depuracion_primaria_oficial.php --ejecutar
 *
 * USO:
 *   php scripts/autocomplete_depuracion_primaria_oficial.php
 *   php scripts/autocomplete_depuracion_primaria_oficial.php --ejecutar
 * ============================================================================
 */

// ─── Bootstrap Laravel ───────────────────────────────────────────────────────
require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

// ─── Modo de ejecución ───────────────────────────────────────────────────────
$dryRun = !in_array('--ejecutar', $argv ?? []);

// ─── Paleta de colores para consola ──────────────────────────────────────────
$GREEN  = "\033[32m";
$YELLOW = "\033[33m";
$RED    = "\033[31m";
$CYAN   = "\033[36m";
$BOLD   = "\033[1m";
$RESET  = "\033[0m";

// ─── Contadores ──────────────────────────────────────────────────────────────
$vinculados   = 0;
$ambiguos     = 0;
$sinMatch     = 0;
$saltados     = 0;

echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  AUTOCOMPLETAR DEPURACIÓN – PRIMARIA OFICIAL (Paso 1){$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  ⚠  MODO DRY-RUN: No se realizarán cambios en la BD.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}     Para guardar, corré: --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔  MODO EJECUCIÓN REAL – los cambios se guardarán.{$RESET}" . PHP_EOL;
}
echo PHP_EOL;

// ─── Paso 1: Obtener candidatos de depuración ────────────────────────────────
// Registros ACTIVO, sin vincular, nivel PRIMARIA, gestión OFICIAL
$candidatos = DB::table('depuracion_centros_sectores')
    ->whereNull('establecimiento_id')
    ->where('estado_depuracion', 'ACTIVO')
    ->whereRaw("UPPER(TRIM(nivel)) = 'PRIMARIA'")
    ->whereRaw("UPPER(TRIM(gestion)) = 'OFICIAL'")
    ->orderBy('sector')
    ->orderBy('centro')
    ->get();

$total = $candidatos->count();
echo "{$CYAN}  Candidatos encontrados (ACTIVO + sin vincular + PRIMARIA + OFICIAL): {$BOLD}{$total}{$RESET}" . PHP_EOL;
echo PHP_EOL;

if ($total === 0) {
    echo "{$GREEN}  No hay candidatos para procesar. ¡Todo vinculado o no hay registros PRIMARIA OFICIAL sin vincular!{$RESET}" . PHP_EOL;
    exit(0);
}

// ─── Log de resultados ───────────────────────────────────────────────────────
$logVinculados = [];
$logAmbiguos   = [];
$logSinMatch   = [];

// ─── Paso 2: Procesar cada candidato ─────────────────────────────────────────
foreach ($candidatos as $dep) {
    $sectorNum = (int) $dep->sector;

    // ── Buscar modalidades que tengan este sector Y nivel PRIMARIO ──────────
    // En SIGE: nivel_educativo ∈ {PRIMARIO, ALBERGUE}, direccion_area = PRIMARIO
    $modalidades = DB::table('modalidades as m')
        ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
        ->whereNull('m.deleted_at')
        ->whereRaw("CAST(m.sector AS INTEGER) = ?", [$sectorNum])
        ->whereIn('m.nivel_educativo', ['PRIMARIO', 'ALBERGUE'])
        ->where('m.direccion_area', 'PRIMARIO')
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

    // ── Contar cuántas modalidades distintas encontramos ───────────────────
    $cantMatch = $modalidades->count();

    if ($cantMatch === 0) {
        // No hay match en SIGE para este sector+nivel
        $sinMatch++;
        $logSinMatch[] = [
            'id'      => $dep->id,
            'centro'  => $dep->centro,
            'sector'  => $dep->sector,
            'nom_sector' => $dep->nom_sector,
            'nivel'   => $dep->nivel,
            'gestion' => $dep->gestion,
        ];
        echo "  {$RED}✗ SIN MATCH{$RESET}  Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
        continue;
    }

    if ($cantMatch > 1) {
        // Más de un establecimiento candidato → ambigüedad
        // FILTRO ADICIONAL: solo acepto como único si el establecimiento
        // tiene un único nivel (una sola modalidad activa).
        // Separamos los que son de establecimiento con 1 solo nivel:
        $establecimientosUnicos = $modalidades
            ->groupBy('establecimiento_id')
            ->filter(function ($mods) {
                // El establecimiento debe tener EXACTAMENTE 1 modalidad activa en total
                $estId = $mods->first()->establecimiento_id;
                $totalModalidades = DB::table('modalidades')
                    ->where('establecimiento_id', $estId)
                    ->whereNull('deleted_at')
                    ->count();
                return $totalModalidades === 1;
            });

        if ($establecimientosUnicos->count() === 1) {
            // Hay exactamente 1 establecimiento con un solo nivel que hace match
            $matchFinal = $establecimientosUnicos->first()->first();
        } elseif ($establecimientosUnicos->count() === 0 && $modalidades->count() === 1) {
            // Solo hay una modalidad aunque el establecimiento tenga varios niveles
            // (caso borde, igualmente es único candidato)
            $matchFinal = $modalidades->first();
        } else {
            // Ambigüedad real
            $ambiguos++;
            $cues = $modalidades->map(fn($m) => "CUE {$m->cue} ({$m->nom_establecimiento})")->implode(' | ');
            $logAmbiguos[] = [
                'id'         => $dep->id,
                'centro'     => $dep->centro,
                'sector'     => $dep->sector,
                'nom_sector' => $dep->nom_sector,
                'candidatos' => $cues,
            ];
            echo "  {$YELLOW}⚠ AMBIGUO{$RESET}   Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
            echo "            Candidatos: {$cues}" . PHP_EOL;
            continue;
        }
    } else {
        // Exactamente 1 match
        $matchCandidato = $modalidades->first();

        // Verificar que el establecimiento tiene UN SOLO nivel (una sola modalidad activa)
        $totalModalidades = DB::table('modalidades')
            ->where('establecimiento_id', $matchCandidato->establecimiento_id)
            ->whereNull('deleted_at')
            ->count();

        if ($totalModalidades !== 1) {
            // El establecimiento tiene varios niveles → manejar manualmente
            $ambiguos++;
            $logAmbiguos[] = [
                'id'         => $dep->id,
                'centro'     => $dep->centro,
                'sector'     => $dep->sector,
                'nom_sector' => $dep->nom_sector,
                'candidatos' => "CUE {$matchCandidato->cue} ({$matchCandidato->nom_establecimiento}) – tiene {$totalModalidades} niveles en SIGE",
            ];
            echo "  {$YELLOW}⚠ MULTI-NIVEL{$RESET} Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
            echo "            {$matchCandidato->cue} tiene {$totalModalidades} niveles, manejo manual" . PHP_EOL;
            continue;
        }

        $matchFinal = $matchCandidato;
    }

    // ── Vinculación confirmada ──────────────────────────────────────────────
    $vinculados++;
    $logVinculados[] = [
        'id'                => $dep->id,
        'centro'            => $dep->centro,
        'sector'            => $dep->sector,
        'nom_sector'        => $dep->nom_sector,
        'cue'               => $matchFinal->cue,
        'nom_establecimiento' => $matchFinal->nom_establecimiento,
        'modalidad_id'      => $matchFinal->modalidad_id,
        'nivel_educativo'   => $matchFinal->nivel_educativo,
        'radio_sige'        => $matchFinal->radio_sige,
    ];

    $obs = "[Auto-vinculado PRIMARIA OFICIAL – Sector {$dep->sector} → CUE {$matchFinal->cue}]";

    echo "  {$GREEN}✔ VINCULAR{$RESET}   Centro {$dep->centro} / Sector {$dep->sector} – {$dep->nom_sector}" . PHP_EOL;
    echo "            → {$matchFinal->nom_establecimiento} (CUE: {$matchFinal->cue}) | Radio: R{$matchFinal->radio_sige}" . PHP_EOL;

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

// ─── Resumen final ───────────────────────────────────────────────────────────
echo PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "{$BOLD}  RESUMEN{$RESET}" . PHP_EOL;
echo "{$BOLD}=============================================================={$RESET}" . PHP_EOL;
echo "  Total candidatos procesados : {$total}" . PHP_EOL;
echo "  {$GREEN}✔ Vinculados                : {$vinculados}{$RESET}" . PHP_EOL;
echo "  {$YELLOW}⚠ Ambiguos / Multi-nivel    : {$ambiguos}{$RESET}" . PHP_EOL;
echo "  {$RED}✗ Sin match en SIGE         : {$sinMatch}{$RESET}" . PHP_EOL;
echo PHP_EOL;

if ($dryRun) {
    echo "{$YELLOW}  DRY-RUN finalizado. Ningún dato fue modificado.{$RESET}" . PHP_EOL;
    echo "{$YELLOW}  Si el resultado te parece correcto, ejecutá:{$RESET}" . PHP_EOL;
    echo "{$YELLOW}    php scripts/autocomplete_depuracion_primaria_oficial.php --ejecutar{$RESET}" . PHP_EOL;
} else {
    echo "{$GREEN}  ✔ Proceso completado. Se vincularon {$vinculados} registros en la BD.{$RESET}" . PHP_EOL;
}

// ─── Detalle de ambiguos y sin match (para revisión manual) ──────────────────
if (!empty($logAmbiguos)) {
    echo PHP_EOL;
    echo "{$YELLOW}{$BOLD}  REQUIEREN REVISIÓN MANUAL (Ambiguos / Multi-nivel):{$RESET}" . PHP_EOL;
    foreach ($logAmbiguos as $a) {
        echo "    ID:{$a['id']} | C:{$a['centro']} S:{$a['sector']} | {$a['nom_sector']}" . PHP_EOL;
        echo "       Candidatos: {$a['candidatos']}" . PHP_EOL;
    }
}

if (!empty($logSinMatch)) {
    echo PHP_EOL;
    echo "{$RED}{$BOLD}  SIN MATCH EN SIGE (sector no encontrado en modalidades PRIMARIO):{$RESET}" . PHP_EOL;
    foreach ($logSinMatch as $s) {
        echo "    ID:{$s['id']} | C:{$s['centro']} S:{$s['sector']} | {$s['nom_sector']} | {$s['nivel']} ({$s['gestion']})" . PHP_EOL;
    }
}

echo PHP_EOL;
