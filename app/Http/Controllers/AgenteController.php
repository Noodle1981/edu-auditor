<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AgenteController extends Controller
{
    public const MAX_HOURS_THRESHOLD = 50;

    public function search(Request $request)
    {
        try {
            $search = trim($request->input('search', ''));
            $revista = strtoupper(trim($request->input('revista', '')));
            $escalafon = strtoupper(trim($request->input('escalafon', '')));
            $turno = strtoupper(trim($request->input('turno', '')));
            $cue = trim($request->input('cue', ''));
            $normaLegal = trim($request->input('norma_legal', ''));

            $page = (int) $request->input('page', 1);
            $limit = (int) $request->input('limit', 20);

            if ($page < 1) {
                $page = 1;
            }
            if ($limit < 1 || $limit > 100) {
                $limit = 20;
            }
            $offset = ($page - 1) * $limit;
            $year = $this->getDefaultYear((int) $request->input('year'));

            // Build queries dynamically
            $bindings = [$year];
            $whereClause = 'WHERE c.anio = ?';

            if ($search !== '') {
                $whereClause .= ' AND (a.dni LIKE ? OR a.nombre_agente LIKE ? OR a.legajo LIKE ?)';
                $searchLike = "%{$search}%";
                array_push($bindings, $searchLike, $searchLike, $searchLike);
            }

            if ($revista !== '') {
                $whereClause .= ' AND c.situacion_revista = ?';
                $bindings[] = $revista;
            }

            if ($escalafon !== '') {
                $whereClause .= ' AND c.escalafon = ?';
                $bindings[] = $escalafon;
            }

            if ($turno !== '') {
                $whereClause .= ' AND c.turno = ?';
                $bindings[] = $turno;
            }

            if ($cue !== '') {
                if (ctype_digit($cue)) {
                    $whereClause .= ' AND c.cue = ?';
                    $bindings[] = (int) $cue;
                }
            }

            if ($normaLegal !== '') {
                $whereClause .= ' AND c.norma_legal LIKE ?';
                $bindings[] = "%{$normaLegal}%";
            }

            // 1. Get total uniques
            $countQuery = "
                SELECT COUNT(DISTINCT a.dni) as total_unicos 
                FROM agentes a
                LEFT JOIN agente_cargos c ON a.dni = c.dni
                {$whereClause}
            ";
            $countResult = DB::selectOne($countQuery, $bindings);
            $totalUnicos = $countResult ? (int) $countResult->total_unicos : 0;

            // 2. Get paginated data
            $dataQuery = "
                SELECT 
                    a.dni, 
                    a.nombre_agente, 
                    a.genero, 
                    a.legajo, 
                    COUNT(c.id) as cargos_activos,
                    SUM(c.horas_catedra) as total_horas_catedra,
                    GROUP_CONCAT(c.establecimiento, '|||') as escuelas
                FROM agentes a
                LEFT JOIN agente_cargos c ON a.dni = c.dni
                {$whereClause}
                GROUP BY a.dni, a.nombre_agente, a.genero, a.legajo
                ORDER BY a.nombre_agente ASC 
                LIMIT ? OFFSET ?
            ";

            $dataBindings = array_merge($bindings, [$limit, $offset]);
            $rows = DB::select($dataQuery, $dataBindings);

            $dnis = array_column($rows, 'dni');
            $cargosRows = [];
            $licenciasRows = [];
            $suplentesByCupof = [];

            if (! empty($dnis)) {
                $placeholders = implode(',', array_fill(0, count($dnis), '?'));

                // Fetch cargos
                $cargosRows = DB::select("
                    SELECT id, dni, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra, turno, plan_estudio, situacion_revista, norma_legal
                    FROM agente_cargos
                    WHERE anio = ? AND dni IN ({$placeholders})
                ", array_merge([$year], $dnis));

                // Fetch active licencias
                $today = Carbon::today()->setYear($year);
                $todayStr = $today->format('Y-m-d');
                $licenciasRows = DB::select("
                    SELECT id, dni, tipo_licencia, cupof_licencia, fecha_inicio, fecha_fin
                    FROM licencias
                    WHERE fecha_inicio <= ? AND fecha_fin >= ? AND dni IN ({$placeholders})
                ", array_merge([$todayStr, $todayStr], $dnis));

                // Fetch suplentes map for these cupofs
                $cupofs = array_filter(array_column($cargosRows, 'cupof'));
                if (! empty($cupofs)) {
                    $cupofs = array_unique($cupofs);
                    $cupofPlaceholders = implode(',', array_fill(0, count($cupofs), '?'));
                    $suplentesRows = DB::select("
                        SELECT ac.cupof, ac.dni, ac.situacion_revista, a.nombre_agente
                        FROM agente_cargos ac
                        LEFT JOIN agentes a ON a.dni = ac.dni
                        WHERE ac.anio = ? AND ac.situacion_revista IN ('SUPLENTE', 'REEMPLAZANTE') AND ac.cupof IN ({$cupofPlaceholders})
                    ", array_merge([$year], $cupofs));
                    foreach ($suplentesRows as $supl) {
                        $suplentesByCupof[$supl->cupof] = $supl;
                    }
                }
            }

            $cargosByDni = [];
            foreach ($cargosRows as $c) {
                $cargosByDni[$c->dni][] = $c;
            }

            $licenciasByDni = [];
            foreach ($licenciasRows as $lic) {
                $licenciasByDni[$lic->dni][] = $lic;
            }

            $excludedLics = array_map([self::class, 'normalizeLicenseName'], self::getExcludedLicenseTypes());
            $today = Carbon::today()->setYear($year);

            $data = [];
            foreach ($rows as $r) {
                $dni = $r->dni;
                $cargos = $cargosByDni[$dni] ?? [];

                // Perform quick audit on these cargos to determine coverage/activo state
                $cargoAudit = $this->buildCargoAudit($cargos, $year, $suplentesByCupof);

                // Match licenses
                $agentLics = $licenciasByDni[$dni] ?? [];
                $activeLics = [];
                foreach ($agentLics as $lic) {
                    $start = self::parseAuditDate($lic->fecha_inicio);
                    $end = self::parseAuditDate($lic->fecha_fin);
                    if ($start && $end && $start->lte($today) && $today->lte($end)) {
                        $normDb = self::normalizeLicenseName($lic->tipo_licencia);
                        if (in_array($normDb, $excludedLics)) {
                            $activeLics[] = $lic;
                        }
                    }
                }
                $activeLicCount = count($activeLics);

                $cargosWithSuplente = 0;
                foreach ($cargoAudit as &$ca) {
                    if ($ca['tiene_suplente']) {
                        $ca['estado_cobertura'] = 'cubierto_suplente';
                        $cargosWithSuplente++;
                    } else {
                        $ca['estado_cobertura'] = 'pendiente';
                    }
                }
                unset($ca);

                // --- Matching por CUPOF exacto (nuevo) ---
                $agentActiveLics = array_filter($licenciasByDni[$dni] ?? [], function ($lic) use ($today) {
                    $start = self::parseAuditDate($lic->fecha_inicio);
                    $end = self::parseAuditDate($lic->fecha_fin);
                    if (! $start || ! $end) {
                        return false;
                    }
                    $normDb = self::normalizeLicenseName($lic->tipo_licencia);

                    return $start->lte($today) && $today->lte($end)
                        && in_array($normDb, $excludedLics);
                });

                $licsByCupof = [];
                $licsSinCupof = [];
                foreach ($agentActiveLics as $lic) {
                    if (! empty($lic->cupof_licencia)) {
                        $licsByCupof[$lic->cupof_licencia] = $lic;
                    } else {
                        $licsSinCupof[] = $lic;
                    }
                }

                // Paso 1: CUPOF exacto
                foreach ($cargoAudit as &$ca) {
                    if ($ca['estado_cobertura'] === 'pendiente'
                        && ! empty($ca['cupof'])
                        && isset($licsByCupof[$ca['cupof']])) {
                        $ca['estado_cobertura'] = 'licencia_sin_suplente_db';
                        unset($licsByCupof[$ca['cupof']]);
                    }
                }
                unset($ca);

                // Paso 2: fallback por horas para licencias sin CUPOF (datos históricos)
                $unmatchedLicsCount = count($licsSinCupof);

                usort($cargoAudit, function ($a, $b) {
                    if ($a['estado_cobertura'] === 'cubierto_suplente' && $b['estado_cobertura'] !== 'cubierto_suplente') {
                        return 1;
                    }
                    if ($a['estado_cobertura'] !== 'cubierto_suplente' && $b['estado_cobertura'] === 'cubierto_suplente') {
                        return -1;
                    }

                    return $b['horas_equivalentes'] <=> $a['horas_equivalentes'];
                });

                $matchedFromLicCount = 0;
                foreach ($cargoAudit as &$ca) {
                    if ($ca['estado_cobertura'] === 'pendiente') {
                        if ($matchedFromLicCount < $unmatchedLicsCount) {
                            $ca['estado_cobertura'] = 'licencia_sin_suplente_db';
                            $matchedFromLicCount++;
                        } else {
                            $ca['estado_cobertura'] = 'activo';
                        }
                    }
                }
                unset($ca);

                $jergaInfo = $this->getCargoHorasJergaInfo($cargoAudit);

                // Split and clean schools string to get unique list
                $escuelas = $r->escuelas;
                if ($escuelas) {
                    $escuelasArray = array_unique(array_map('trim', explode('|||', $escuelas)));
                    $escuelas = implode('; ', $escuelasArray);
                } else {
                    $escuelas = 'No especificada';
                }

                $data[] = [
                    'dni' => $r->dni,
                    'nombre_agente' => $r->nombre_agente,
                    'genero' => $r->genero,
                    'legajo' => $r->legajo,
                    'cargos_activos' => (int) $r->cargos_activos,
                    'total_horas_catedra' => (int) $r->total_horas_catedra,
                    'escuelas' => $escuelas,
                    'cargos_funcionales_total' => $jergaInfo['cargos_funcionales_total'],
                    'horas_catedra_total' => $jergaInfo['horas_catedra_total'],
                    'cargos_funcionales_activo' => $jergaInfo['cargos_funcionales_activo'],
                    'horas_catedra_activo' => $jergaInfo['horas_catedra_activo'],
                    'jerga_total' => $jergaInfo['jerga_total'],
                    'jerga_activa' => $jergaInfo['jerga_activa'],
                ];
            }

            return response()->json([
                'data' => $data,
                'total' => $totalUnicos,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($totalUnicos / $limit),
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function detail($dni)
    {
        try {
            if (! $dni) {
                return response()->json(['error' => 'DNI is required'], 400);
            }

            // 1. Fetch parent agent info
            $agentInfo = DB::selectOne('SELECT dni, nombre_agente, genero, legajo, fecha_alta FROM agentes WHERE dni = ?', [$dni]);
            if (! $agentInfo) {
                $search = trim($dni);
                $agentInfo = DB::selectOne('
                    SELECT dni, nombre_agente, genero, legajo, fecha_alta 
                    FROM agentes 
                    WHERE legajo = ? OR UPPER(nombre_agente) = ? OR nombre_agente LIKE ?
                    LIMIT 1
                ', [$search, strtoupper($search), "%{$search}%"]);
                if ($agentInfo) {
                    $dni = $agentInfo->dni;
                }
            }
            if (! $agentInfo) {
                return response()->json(['error' => 'Agent not found in unified database'], 404);
            }

            $year = $this->getDefaultYear((int) request()->query('year'));

            // 2. Fetch active cargos
            $rowsAgentes = DB::select('
                SELECT id, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, situacion_revista, norma_legal, observaciones, control_id 
                FROM agente_cargos 
                WHERE dni = ? AND anio = ?
                ORDER BY id DESC
            ', [$dni, $year]);

            // Add fields to match what frontend expects
            foreach ($rowsAgentes as $r) {
                $r->dni = $agentInfo->dni;
                $r->nombre_agente = $agentInfo->nombre_agente;
                $r->genero = $agentInfo->genero;
                $r->legajo = $agentInfo->legajo;
                $r->fecha_alta = $agentInfo->fecha_alta;
            }

            $profile = [
                'dni' => $agentInfo->dni,
                'nombre_agente' => $agentInfo->nombre_agente,
                'genero' => $agentInfo->genero,
                'legajo' => $agentInfo->legajo,
                'cargos_count' => count($rowsAgentes),
                'total_horas_catedra' => array_sum(array_map(fn ($r) => (int) $r->horas_catedra, $rowsAgentes)),
                'cargos' => $rowsAgentes,
            ];

            // 2. Fetch designaciones
            $rowsDesig = DB::select('
                SELECT id, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, nombre_agente, dni, genero, legajo, 
                       fecha_alta, situacion_revista, norma_legal, observaciones, control_id 
                FROM designaciones 
                WHERE dni = ? AND anio = ?
                ORDER BY fecha_alta DESC
            ', [$dni, $year]);
            $profile['designaciones'] = $rowsDesig;

            // Collect unique CUEs
            $cues = [];
            foreach ($rowsAgentes as $r) {
                if ($r->cue !== null) {
                    $cues[] = $r->cue;
                }
            }
            foreach ($rowsDesig as $r) {
                if ($r->cue !== null) {
                    $cues[] = $r->cue;
                }
            }
            $cues = array_unique($cues);

            // 3. Fetch licencias
            $rowsLic = DB::select('
                SELECT id, id_tramite, fecha_carga, nombre_agente, dni, genero,
                       tipo_licencia, cupof_licencia, documento_respaldo, fecha_inicio, fecha_fin, dias, referencia_interna
                FROM licencias 
                WHERE dni = ?
                ORDER BY fecha_inicio DESC
            ', [$dni]);
            $profile['licencias'] = $rowsLic;

            // 4. Fetch escuelas info
            $profile['escuelas_fisicas'] = (object) [];
            if (! empty($cues)) {
                $placeholders = implode(',', array_fill(0, count($cues), '?'));
                $rowsEst = DB::select("
                    SELECT e.cue, e.nombre as nombre_establecimiento,
                           ed.calle, ed.numero_puerta, ed.codigo_postal, ed.localidad,
                           ed.latitud, ed.longitud, ed.te_voip, ed.zona_departamento as departamento,
                           m.nivel_educativo, m.direccion_area, m.zona, m.sector
                    FROM establecimientos e
                    LEFT JOIN edificios ed ON e.edificio_id = ed.id
                    LEFT JOIN modalidades m ON m.establecimiento_id = e.id
                    WHERE e.cue IN ({$placeholders})
                ", array_values($cues));

                $escuelasFisicas = [];
                foreach ($rowsEst as $r) {
                    $escuelasFisicas[$r->cue] = $r;
                }
                $profile['escuelas_fisicas'] = (object) $escuelasFisicas;
            }

            // 5. Automated Audit (Active licenses & cargo-level coverage)
            $activeLics = [];
            $today = Carbon::today()->setYear($year);
            $excludedLics = array_map([self::class, 'normalizeLicenseName'], self::getExcludedLicenseTypes());

            foreach ($profile['licencias'] as $lic) {
                $start = self::parseAuditDate($lic->fecha_inicio);
                $end = self::parseAuditDate($lic->fecha_fin);
                if ($start && $end && $start->lte($today) && $today->lte($end)) {
                    $normDb = self::normalizeLicenseName($lic->tipo_licencia);
                    if (in_array($normDb, $excludedLics)) {
                        $activeLics[] = $lic;
                    }
                }
            }
            $activeLicCount = count($activeLics);

            // Audit each cargo
            $cargoAudit = $this->buildCargoAudit($rowsAgentes, $year);

            // Match suplentes first
            $cargosWithSuplente = 0;
            foreach ($cargoAudit as &$ca) {
                if ($ca['tiene_suplente']) {
                    $ca['estado_cobertura'] = 'cubierto_suplente';
                    $cargosWithSuplente++;
                } else {
                    $ca['estado_cobertura'] = 'pendiente';
                }
            }
            unset($ca);

            // --- Matching por CUPOF exacto ---
            $licsByCupof = [];
            $licsSinCupof = [];
            foreach ($activeLics as $lic) {
                if (! empty($lic->cupof_licencia)) {
                    $licsByCupof[$lic->cupof_licencia] = $lic;
                } else {
                    $licsSinCupof[] = $lic;
                }
            }

            // Paso 1: CUPOF exacto
            foreach ($cargoAudit as &$ca) {
                if ($ca['estado_cobertura'] === 'pendiente'
                    && ! empty($ca['cupof'])
                    && isset($licsByCupof[$ca['cupof']])) {
                    $ca['estado_cobertura'] = 'licencia_sin_suplente_db';
                    unset($licsByCupof[$ca['cupof']]);
                }
            }
            unset($ca);

            // Paso 2: fallback por horas para licencias sin CUPOF (datos históricos)
            $unmatchedLicsCount = count($licsSinCupof);

            usort($cargoAudit, function ($a, $b) {
                if ($a['estado_cobertura'] === 'cubierto_suplente' && $b['estado_cobertura'] !== 'cubierto_suplente') {
                    return 1;
                }
                if ($a['estado_cobertura'] !== 'cubierto_suplente' && $b['estado_cobertura'] === 'cubierto_suplente') {
                    return -1;
                }

                return $b['horas_equivalentes'] <=> $a['horas_equivalentes'];
            });

            $matchedFromLicCount = 0;
            foreach ($cargoAudit as &$ca) {
                if ($ca['estado_cobertura'] === 'pendiente') {
                    if ($matchedFromLicCount < $unmatchedLicsCount) {
                        $ca['estado_cobertura'] = 'licencia_sin_suplente_db';
                        $matchedFromLicCount++;
                    } else {
                        $ca['estado_cobertura'] = 'activo';
                    }
                }
            }
            unset($ca);

            // Restore original order
            usort($cargoAudit, function ($a, $b) {
                return $b['id'] <=> $a['id'];
            });

            // Calculate totals
            $totalHorasEquiv = 0;
            $horasCubiertas = 0;
            $horasActivas = 0;
            $tieneLicenciaSinSuplente = false;

            foreach ($cargoAudit as $ca) {
                $hs = $ca['horas_equivalentes'];
                $totalHorasEquiv += $hs;
                if ($ca['estado_cobertura'] === 'cubierto_suplente' || $ca['estado_cobertura'] === 'licencia_sin_suplente_db') {
                    $horasCubiertas += $hs;
                    if ($ca['estado_cobertura'] === 'licencia_sin_suplente_db') {
                        $tieneLicenciaSinSuplente = true;
                    }
                } else {
                    $horasActivas += $hs;
                }
            }

            $statusAuditoria = 'regular';
            if ($horasActivas > self::MAX_HOURS_THRESHOLD) {
                $statusAuditoria = 'incompatibilidad_critica';
            } elseif ($totalHorasEquiv > self::MAX_HOURS_THRESHOLD && $horasCubiertas > 0) {
                $statusAuditoria = 'exceso_justificado';
            }

            // Update the profile cargos to be the enriched cargo audit list
            $profile['cargos'] = $cargoAudit;
            $profile['total_horas_catedra'] = $totalHorasEquiv; // total including equivalencies for compatibility

            $jergaInfo = $this->getCargoHorasJergaInfo($cargoAudit);
            $profile['cargos_funcionales_total'] = $jergaInfo['cargos_funcionales_total'];
            $profile['horas_catedra_total'] = $jergaInfo['horas_catedra_total'];
            $profile['cargos_funcionales_activo'] = $jergaInfo['cargos_funcionales_activo'];
            $profile['horas_catedra_activo'] = $jergaInfo['horas_catedra_activo'];
            $profile['jerga_total'] = $jergaInfo['jerga_total'];
            $profile['jerga_activa'] = $jergaInfo['jerga_activa'];

            $profile['auditoria'] = [
                'alerta_incompatibilidad_horas' => $horasActivas > self::MAX_HOURS_THRESHOLD,
                'alerta_multi_cargo' => $profile['cargos_count'] > 1,
                'licencias_activas' => $activeLics,
                'tiene_licencia_activa' => ! empty($activeLics),
                'horas_licenciadas' => $horasCubiertas,
                'horas_activas_netas' => $horasActivas,
                'status_auditoria' => $statusAuditoria,
                'coincide_en_designaciones' => count($profile['designaciones']) > 0,
                'requiere_auditoria_af' => ($horasActivas > self::MAX_HOURS_THRESHOLD) || ($profile['cargos_count'] > 1) || ! empty($activeLics),
            ];

            return response()->json($profile);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function auditoriaAutomatizadaPage()
    {
        return Inertia::render('AuditoriaAutomatizada');
    }

    public function getLocalAnalysis($dni)
    {
        try {
            $agentInfo = DB::selectOne('SELECT dni, nombre_agente, genero, legajo, fecha_alta FROM agentes WHERE dni = ?', [$dni]);
            if (! $agentInfo) {
                return response()->json(['error' => 'No se encontró ningún agente con el DNI ingresado.'], 404);
            }

            $year = $this->getDefaultYear((int) request()->query('year'));

            $cargos = DB::select('
                SELECT id, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, situacion_revista, norma_legal, observaciones
                FROM agente_cargos 
                WHERE dni = ? AND anio = ?
            ', [$dni, $year]);

            $designaciones = DB::select('
                SELECT centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, situacion_revista, norma_legal, observaciones
                FROM designaciones 
                WHERE dni = ? AND anio = ?
            ', [$dni, $year]);

            $licencias = DB::select('
                SELECT id_tramite, fecha_carga, tipo_licencia, cupof_licencia, fecha_inicio, fecha_fin, dias, documento_respaldo
                FROM licencias 
                WHERE dni = ?
            ', [$dni]);

            // Fetch physical school details
            $cues = [];
            foreach ($cargos as $c) {
                if ($c->cue !== null) {
                    $cues[] = $c->cue;
                }
            }
            $cues = array_unique($cues);

            $escuelasFisicas = [];
            if (! empty($cues)) {
                $placeholders = implode(',', array_fill(0, count($cues), '?'));
                $rowsEst = DB::select("
                    SELECT e.cue, e.nombre as nombre_establecimiento,
                           ed.latitud, ed.longitud, ed.calle, ed.numero_puerta, ed.localidad
                    FROM establecimientos e
                    LEFT JOIN edificios ed ON e.edificio_id = ed.id
                    WHERE e.cue IN ({$placeholders})
                ", array_values($cues));
                foreach ($rowsEst as $r) {
                    $escuelasFisicas[$r->cue] = $r;
                }
            }

            // Perform calculations using the updated cargo-level audit
            $activeLics = [];
            $today = Carbon::today()->setYear($year);
            $excludedLics = array_map([self::class, 'normalizeLicenseName'], self::getExcludedLicenseTypes());

            foreach ($licencias as $lic) {
                $start = self::parseAuditDate($lic->fecha_inicio);
                $end = self::parseAuditDate($lic->fecha_fin);
                if ($start && $end && $start->lte($today) && $today->lte($end)) {
                    $normDb = self::normalizeLicenseName($lic->tipo_licencia);
                    if (in_array($normDb, $excludedLics)) {
                        $activeLics[] = $lic;
                    }
                }
            }
            $activeLicCount = count($activeLics);

            // Audit each cargo
            $cargoAudit = $this->buildCargoAudit($cargos, $year);

            // Match suplentes first
            $cargosWithSuplente = 0;
            foreach ($cargoAudit as &$ca) {
                if ($ca['tiene_suplente']) {
                    $ca['estado_cobertura'] = 'cubierto_suplente';
                    $cargosWithSuplente++;
                } else {
                    $ca['estado_cobertura'] = 'pendiente';
                }
            }
            unset($ca);

            // --- Matching por CUPOF exacto ---
            $licsByCupof = [];
            $licsSinCupof = [];
            foreach ($activeLics as $lic) {
                if (! empty($lic->cupof_licencia)) {
                    $licsByCupof[$lic->cupof_licencia] = $lic;
                } else {
                    $licsSinCupof[] = $lic;
                }
            }

            // Paso 1: CUPOF exacto
            foreach ($cargoAudit as &$ca) {
                if ($ca['estado_cobertura'] === 'pendiente'
                    && ! empty($ca['cupof'])
                    && isset($licsByCupof[$ca['cupof']])) {
                    $ca['estado_cobertura'] = 'licencia_sin_suplente_db';
                    unset($licsByCupof[$ca['cupof']]);
                }
            }
            unset($ca);

            // Paso 2: fallback por horas para licencias sin CUPOF
            $hasActiveLicense = count($licsSinCupof) > 0;

            foreach ($cargoAudit as &$ca) {
                if ($ca['estado_cobertura'] === 'pendiente') {
                    if ($hasActiveLicense) {
                        $ca['estado_cobertura'] = 'licencia_sin_suplente_db';
                    } else {
                        $ca['estado_cobertura'] = 'activo';
                    }
                }
            }
            unset($ca);

            $totalRealHours = array_sum(array_map(fn ($c) => (int) $c->horas_catedra, $cargos));
            $totalEstimatedHours = 0;
            $horasCubiertas = 0;
            $horasActivasNetas = 0;

            $cargosDetalles = [];
            foreach ($cargoAudit as $idx => $ca) {
                $hs = $ca['horas_equivalentes'];
                $totalEstimatedHours += $hs;
                if ($ca['estado_cobertura'] === 'cubierto_suplente' || $ca['estado_cobertura'] === 'licencia_sin_suplente_db') {
                    $horasCubiertas += $hs;
                } else {
                    $horasActivasNetas += $hs;
                }

                $motivoEstimacion = '';
                if ((int) $ca['horas_catedra'] === 0) {
                    $motivoEstimacion = ' ('.$ca['etiqueta_equivalencia'].')';
                }

                $coberturaLabel = 'Activo';
                if ($ca['estado_cobertura'] === 'cubierto_suplente') {
                    $coberturaLabel = 'Cubierto por suplente (DNI: '.($ca['suplente_dni'] ?? '-').' - '.($ca['suplente_nombre'] ?? '-').')';
                } elseif ($ca['estado_cobertura'] === 'licencia_sin_suplente_db') {
                    $coberturaLabel = 'Licenciado sin suplente registrado';
                }

                $cargosDetalles[] = [
                    'cargo' => $ca['cargo_horas'] ?: 'Cargo no especificado',
                    'escuela' => $ca['establecimiento'] ?: 'Escuela no especificada',
                    'cue' => $ca['cue'],
                    'turno' => $ca['turno'] ?: 'No especificado',
                    'horas_reales' => (int) $ca['horas_catedra'],
                    'horas_estimadas' => $hs,
                    'motivo_estimacion' => $motivoEstimacion,
                    'situacion_revista' => $ca['situacion_revista'] ?: 'No especificada',
                    'cobertura_label' => $coberturaLabel,
                ];
            }

            $statusAuditoria = 'regular';
            if ($horasActivasNetas > self::MAX_HOURS_THRESHOLD) {
                $statusAuditoria = 'incompatibilidad_critica';
            } elseif ($totalEstimatedHours > self::MAX_HOURS_THRESHOLD && $horasCubiertas > 0) {
                $statusAuditoria = 'exceso_justificado';
            }

            // Incompatibilidades
            $incompHoraria = $horasActivasNetas > self::MAX_HOURS_THRESHOLD;
            $horasLicenciadas = $horasCubiertas;

            // Geo dispersion & travel risk
            $distanciaComentarios = [];
            $highRiskGeo = false;
            $escuelasList = array_values($escuelasFisicas);
            $numEscuelas = count($escuelasList);
            for ($i = 0; $i < $numEscuelas; $i++) {
                for ($j = $i + 1; $j < $numEscuelas; $j++) {
                    $e1 = $escuelasList[$i];
                    $e2 = $escuelasList[$j];
                    if (isset($e1->latitud) && isset($e1->longitud) && isset($e2->latitud) && isset($e2->longitud) &&
                        $e1->latitud !== null && $e1->longitud !== null && $e2->latitud !== null && $e2->longitud !== null) {
                        $dist = $this->calculateDistance($e1->latitud, $e1->longitud, $e2->latitud, $e2->longitud);
                        $distStr = number_format($dist, 2).' km';
                        $distanciaComentarios[] = "- Distancia entre **{$e1->nombre_establecimiento}** (CUE: {$e1->cue}) y **{$e2->nombre_establecimiento}** (CUE: {$e2->cue}): **{$distStr}**.";
                        if ($dist > 10) {
                            $highRiskGeo = true;
                        }
                    } else {
                        $distanciaComentarios[] = "- Falta geolocalización completa para comparar **{$e1->nombre_establecimiento}** y **{$e2->nombre_establecimiento}**.";
                    }
                }
            }

            // Discrepancias administrativas
            $discrepancias = [];

            // 1. Fecha de alta futura
            if ($agentInfo->fecha_alta) {
                $alta = Carbon::parse($agentInfo->fecha_alta);
                if ($alta->isFuture()) {
                    $discrepancias[] = "Fecha de alta registrada es futura: **{$agentInfo->fecha_alta}** (inconsistencia cronológica).";
                }
            }

            // 2. Overlapping turns
            $turnosActivos = [];
            foreach ($cargos as $c) {
                if ($c->turno) {
                    $turnoNorm = strtolower(trim($c->turno));
                    if (str_contains($turnoNorm, 'mañana')) {
                        $turnosActivos['mañana'][] = $c;
                    } elseif (str_contains($turnoNorm, 'tarde')) {
                        $turnosActivos['tarde'][] = $c;
                    } elseif (str_contains($turnoNorm, 'noche') || str_contains($turnoNorm, 'vespertino')) {
                        $turnosActivos['noche'][] = $c;
                    }
                }
            }
            foreach ($turnosActivos as $t => $list) {
                if (count($list) > 1) {
                    $cargosNombres = implode(' y ', array_map(fn ($item) => "'{$item->cargo_horas}' en '{$item->establecimiento}'", $list));
                    $discrepancias[] = 'Posible superposición horaria directa: El docente posee **'.count($list).'** cargos en el **Turno '.ucfirst($t)."** ({$cargosNombres}).";
                }
            }

            // 3. Cargos sin coincidencia en designaciones
            if (count($cargos) !== count($designaciones)) {
                $discrepancias[] = 'Discrepancia en registros de cargos: Se registran **'.count($cargos).'** cargos activos en planta pero figuran **'.count($designaciones).'** designaciones históricas en el sistema.';
            }

            // Generate report in Markdown
            $hoy = Carbon::now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
            $nombre = e($agentInfo->nombre_agente);
            $dniDoc = number_format((int) $dni, 0, ',', '.');

            $markdown = "*SISTEMA INTEGRAL DE AGENTES - MINISTERIO DE EDUCACIÓN\n";
            $markdown .= "*REPORTE DE ESTADO POF/PON\n";
            $markdown .= "*Fecha: {$hoy}\n";
            $markdown .= "*Agente: {$nombre} (DNI: {$dniDoc})\n";
            $markdown .= "--\n\n";

            $markdown .= "*1. INTRODUCCIÓN\n";
            $markdown .= "El presente reporte detalla el estado actual de los cargos asignados al agente **{$nombre}**, con DNI **{$dniDoc}** y Legajo **{$agentInfo->legajo}**. La información refleja el contexto de la Planta Orgánica Nominal (PON) y Funcional (POF), brindando claridad sobre las licencias activas y los reemplazos correspondientes.\n\n";

            $markdown .= "*2. DATOS DEL AGENTE\n";
            $markdown .= "DNI: **{$agentInfo->dni}**\n";
            $markdown .= "Nombre Completo: **{$nombre}**\n";
            $markdown .= 'Género: **'.($agentInfo->genero === 'F' ? 'Femenino' : 'Masculino')."**\n";
            $markdown .= 'Legajo: **'.($agentInfo->legajo ?: 'Sin legajo')."**\n";
            $markdown .= 'Fecha de Alta: **'.($agentInfo->fecha_alta ? date('d/m/Y', strtotime($agentInfo->fecha_alta)) : 'No registrada')."**\n";
            $markdown .= 'Total de Cargos Asignados: **'.count($cargos)."**\n";
            $markdown .= "Horas Cátedra Totales: **{$totalRealHours} hs** (Equivalentes: **{$totalEstimatedHours} hs**)\n";
            $markdown .= "Horas Licenciadas (Hoy): **{$horasLicenciadas} hs**\n";
            $markdown .= "Horas Activas Netas (Frente a Aula): **{$horasActivasNetas} hs**\n\n";

            $markdown .= "*3. DETALLE DE CARGOS Y COBERTURA (PON/POF)\n";

            if (count($cargosDetalles) === 0) {
                $markdown .= "No se registran cargos activos en el presente año lectivo.\n\n";
            } else {
                foreach ($cargosDetalles as $idx => $cd) {
                    $num = $idx + 1;
                    $markdown .= "**Cargo {$num}**: {$cd['cargo']} en *{$cd['escuela']}* (CUE: {$cd['cue']}).\n";
                    $markdown .= "- Turno: *{$cd['turno']}*\n";
                    $markdown .= "- Carga horaria: **{$cd['horas_estimadas']} hs**{$cd['motivo_estimacion']}\n";

                    $sitRev = strtoupper($cd['situacion_revista']);
                    if (in_array($sitRev, ['SUPLENTE', 'REEMPLAZANTE'])) {
                        $markdown .= "- Situación de Revista: *{$cd['situacion_revista']}* (TOMÓ CARGO POR Licencia Activa de docente asignado)\n";
                    } else {
                        $markdown .= "- Situación de Revista: *{$cd['situacion_revista']}*\n";
                    }

                    $markdown .= "- Estado POF: *{$cd['cobertura_label']}*\n\n";
                }
            }

            $markdown .= "--\n";
            $markdown .= "Este reporte proporciona una vista consolidada para el análisis de recursos humanos e instrumentación docente.\n\n";
            $markdown .= "*Sistema SIAME\n";
            $markdown .= "*Ministerio de Educación\n";

            return response()->json([
                'report' => $markdown,
                'agent' => [
                    'dni' => $agentInfo->dni,
                    'nombre_agente' => $agentInfo->nombre_agente,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // in km
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    public static function getCargoCostEquivalencia($cargoHoras, $planEstudio): array
    {
        $cfg = config('auditoria.equivalencias_cargo', []);
        $desc = strtolower(($cargoHoras ?? '').' '.($planEstudio ?? ''));
        foreach ($cfg as $rule) {
            foreach ($rule['palabras_clave'] as $kw) {
                if (str_contains($desc, strtolower($kw))) {
                    return ['horas' => $rule['horas_equivalentes'], 'etiqueta' => $rule['etiqueta']];
                }
            }
        }
        $def = config('auditoria.equivalencia_cargo_defecto', ['horas_equivalentes' => 25, 'etiqueta' => 'Cargo sin clasificar (estimado)']);

        return ['horas' => $def['horas_equivalentes'], 'etiqueta' => $def['etiqueta']];
    }

    public static function parseAuditDate($dateStr): ?Carbon
    {
        if (! $dateStr) {
            return null;
        }
        try {
            if (str_contains($dateStr, '/')) {
                $p = array_map('intval', explode('/', $dateStr));
                if ($p[2] < 100) {
                    $p[2] += 2000;
                }

                return Carbon::create($p[2], $p[1], $p[0]);
            } elseif (str_contains($dateStr, '-')) {
                $p = array_map('intval', explode('-', $dateStr));
                if ($p[0] < 100) {
                    $p[0] += 2000;
                }

                return Carbon::create($p[0], $p[1], $p[2]);
            }
        } catch (\Exception $e) {
        }

        return null;
    }

    private function buildCargoAudit(array $cargos, int $year, ?array $suplentesByCupof = null): array
    {
        $result = [];
        foreach ($cargos as $c) {
            $horasReales = (int) $c->horas_catedra;

            // Determinar si es una hora cátedra con dato faltante (0 hs pero descripción de HC)
            // vs un cargo real sin horas (director, maestro, etc.) que merece equivalencia.
            // Si es HC con dato faltante → usamos 0 hs sin estimar, para no inflar el total.
            $esDatoFaltante = ($horasReales === 0) && self::esHoraCatedraConDatoFaltante(
                $c->cupof ?? '',
                $c->cargo_horas ?? ''
            );

            if ($horasReales > 0) {
                // Tiene horas reales registradas
                $tipoCargo = 'horas_catedra';
                $eq = ['horas' => $horasReales, 'etiqueta' => 'Horas Cátedra'];
            } elseif ($esDatoFaltante) {
                // Hora cátedra con 0 en CSV: dato incompleto, no se estima
                $tipoCargo = 'horas_catedra_dato_faltante';
                $eq = ['horas' => 0, 'etiqueta' => 'HC sin cantidad registrada'];
            } else {
                // Cargo real (director, maestro, etc.) con horas=0: aplicar equivalencia
                $tipoCargo = 'cargo';
                $eq = self::getCargoCostEquivalencia($c->cargo_horas, $c->plan_estudio ?? '');
            }

            $tieneSuplente = false;
            $suplenteInfo = null;

            if (! empty($c->cupof)) {
                if (is_array($suplentesByCupof)) {
                    if (isset($suplentesByCupof[$c->cupof])) {
                        $supl = $suplentesByCupof[$c->cupof];
                        if ($supl->dni != $c->dni) {
                            $tieneSuplente = true;
                            $suplenteInfo = $supl;
                        }
                    }
                } else {
                    $suplentes = DB::select("
                        SELECT ac.dni, a.nombre_agente, ac.situacion_revista
                        FROM agente_cargos ac
                        LEFT JOIN agentes a ON a.dni = ac.dni
                        WHERE ac.cupof = ? AND ac.dni != ? AND ac.anio = ?
                          AND ac.situacion_revista IN ('SUPLENTE', 'REEMPLAZANTE')
                        LIMIT 1
                    ", [$c->cupof, $c->dni ?? '', $year]);
                    if (! empty($suplentes)) {
                        $tieneSuplente = true;
                        $suplenteInfo = $suplentes[0];
                    }
                }
            }

            $entry = (array) $c;
            $entry['tipo_cargo'] = $tipoCargo;
            $entry['horas_equivalentes'] = $eq['horas'];
            $entry['etiqueta_equivalencia'] = $eq['etiqueta'];
            $entry['dato_faltante'] = $esDatoFaltante;
            $entry['tiene_suplente'] = $tieneSuplente;
            $entry['suplente_dni'] = $suplenteInfo?->dni ?? null;
            $entry['suplente_nombre'] = $suplenteInfo?->nombre_agente ?? null;
            $result[] = $entry;
        }

        return $result;
    }

    /**
     * Detecta si un cargo con horas_catedra=0 es en realidad una hora cátedra
     * con datos incompletos en el CSV (no un cargo directivo/funcional).
     *
     * Señales de dato faltante:
     *  - El cupof tiene prefijo "HC" (Hora Cátedra) → definitivamente es HC
     *  - cargo_horas dice "Horas de Cátedra" genérico sin especificar cantidad
     *
     * Los cargos reales (director, maestro, etc.) tienen prefijos como:
     *  VRP (Vicerrector), R12 (Rector/Director), DIR, MAE, ACP, etc.
     */
    private static function esHoraCatedraConDatoFaltante(string $cupof, string $cargoHoras): bool
    {
        // Verificar por prefijo del cupof (la parte entre guiones, ej: 700004800-HC2-...)
        if (preg_match('/-HC\d*-/i', $cupof)) {
            return true;
        }

        // Verificar por descripción: "Horas de Cátedra" sin cantidad explícita
        // Si dice "X Hs. Cátedra" tiene cantidad → no es dato faltante
        $desc = strtolower(trim($cargoHoras));
        if (str_contains($desc, 'horas de cátedra') || str_contains($desc, 'horas de catedra')) {
            // Si tiene patrón de cantidad (ej: "4 Hs.", "3 Hs.") → tiene dato real pero horas_catedra=0 por otro motivo
            // Si es solo "Horas de Cátedra Secundario" sin número → dato faltante
            if (! preg_match('/\d+\s*hs\.?/i', $cargoHoras)) {
                return true;
            }
        }

        return false;
    }

    public static function getExcludedLicenseTypes()
    {
        $filePath = base_path('licencias_clasificacion.md');
        if (! file_exists($filePath)) {
            return [];
        }

        $content = file_get_contents($filePath);
        $lines = explode("\n", $content);
        $excluded = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (str_starts_with($line, '|')) {
                $parts = explode('|', $line);
                if (count($parts) >= 4) {
                    $licenseType = trim($parts[1]);
                    $value = trim($parts[2]);
                    if ($value === '1') {
                        $excluded[] = $licenseType;
                    }
                }
            }
        }

        return $excluded;
    }

    private function getCargoHorasJergaInfo(array $cargoAudit): array
    {
        $cargosFuncionalesTotal = 0;
        $horasCatedraTotal = 0;
        $cargosFuncionalesActivo = 0;
        $horasCatedraActivo = 0;

        foreach ($cargoAudit as $ca) {
            $hs = $ca['horas_equivalentes'];
            $isCargo = ($ca['tipo_cargo'] === 'cargo');

            if ($isCargo) {
                $cargosFuncionalesTotal++;
                if (($ca['estado_cobertura'] ?? 'activo') === 'activo') {
                    $cargosFuncionalesActivo++;
                }
            } else {
                $horasCatedraTotal += $hs;
                if (($ca['estado_cobertura'] ?? 'activo') === 'activo') {
                    $horasCatedraActivo += $hs;
                }
            }
        }

        $buildJerga = function ($cargosCount, $horasCount) {
            $partes = [];
            if ($cargosCount > 0) {
                $partes[] = $cargosCount.' '.($cargosCount === 1 ? 'cargo' : 'cargos');
            }
            if ($horasCount > 0) {
                $partes[] = $horasCount.' horas cátedras';
            }
            if (empty($partes)) {
                return '0 horas cátedras';
            }

            return implode(' y ', $partes);
        };

        return [
            'cargos_funcionales_total' => $cargosFuncionalesTotal,
            'horas_catedra_total' => $horasCatedraTotal,
            'cargos_funcionales_activo' => $cargosFuncionalesActivo,
            'horas_catedra_activo' => $horasCatedraActivo,
            'jerga_total' => $buildJerga($cargosFuncionalesTotal, $horasCatedraTotal),
            'jerga_activa' => $buildJerga($cargosFuncionalesActivo, $horasCatedraActivo),
        ];
    }

    public static function normalizeLicenseName($name)
    {
        $name = strtoupper(trim($name));
        $name = str_replace(
            ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ', 'º', 'ª', '°'],
            ['A', 'E', 'I', 'O', 'U', 'U', 'N', '', '', ''],
            $name
        );
        $name = preg_replace('/\s+/', ' ', $name);

        return trim($name);
    }
}
