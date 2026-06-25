<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class EstablecimientoController extends Controller
{
    /**
     * Render the main view of Establecimientos.
     */
    public function index()
    {
        return Inertia::render('Establecimientos');
    }

    /**
     * Search establishments based on filters.
     */
    public function search(Request $request)
    {
        try {
            $search = trim($request->input('search', ''));
            $direccionArea = trim($request->input('direccion_area', ''));
            $nivelEducativo = trim($request->input('nivel_educativo', ''));
            $departamento = trim($request->input('departamento', ''));

            $page = (int)$request->input('page', 1);
            $limit = (int)$request->input('limit', 15);

            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 15;
            $offset = ($page - 1) * $limit;

            $year = (int)$request->input('year');
            if (!$year) {
                $latestYearRow = DB::selectOne("SELECT MAX(anio) as max_year FROM agente_cargos");
                $year = $latestYearRow && $latestYearRow->max_year ? (int)$latestYearRow->max_year : 2026;
            }

            $bindings = [];
            $whereClauses = [
                "e.deleted_at IS NULL",
                "EXISTS (
                    SELECT 1 FROM modalidades m 
                    WHERE m.establecimiento_id = e.id 
                      AND m.ambito = 'PUBLICO' 
                      AND m.deleted_at IS NULL
                )"
            ];

            if ($search !== '') {
                $whereClauses[] = "(e.nombre LIKE ? OR e.cue LIKE ?)";
                $searchLike = "%{$search}%";
                array_push($bindings, $searchLike, $searchLike);
            }

            if ($direccionArea !== '') {
                $whereClauses[] = "EXISTS (
                    SELECT 1 FROM modalidades m 
                    WHERE m.establecimiento_id = e.id 
                      AND m.direccion_area = ? 
                      AND m.ambito = 'PUBLICO'
                      AND m.deleted_at IS NULL
                )";
                $bindings[] = $direccionArea;
            }

            if ($nivelEducativo !== '') {
                $whereClauses[] = "EXISTS (
                    SELECT 1 FROM modalidades m 
                    WHERE m.establecimiento_id = e.id 
                      AND m.nivel_educativo = ? 
                      AND m.ambito = 'PUBLICO'
                      AND m.deleted_at IS NULL
                )";
                $bindings[] = $nivelEducativo;
            }

            if ($departamento !== '') {
                $whereClauses[] = "ed.zona_departamento = ? AND ed.deleted_at IS NULL";
                $bindings[] = $departamento;
            }

            $whereSql = "WHERE " . implode(" AND ", $whereClauses);

            // Count query
            $countQuery = "
                SELECT COUNT(DISTINCT e.id) as total 
                FROM establecimientos e
                LEFT JOIN edificios ed ON e.edificio_id = ed.id
                {$whereSql}
            ";
            $countResult = DB::selectOne($countQuery, $bindings);
            $total = $countResult ? (int)$countResult->total : 0;

            // Data query
            $dataQuery = "
                SELECT e.id, e.cue, e.nombre, e.cue_edificio_principal, e.establecimiento_cabecera,
                       ed.zona_departamento as departamento, ed.localidad
                FROM establecimientos e
                LEFT JOIN edificios ed ON e.edificio_id = ed.id
                {$whereSql}
                ORDER BY e.nombre ASC
                LIMIT ? OFFSET ?
            ";
            $dataBindings = array_merge($bindings, [$limit, $offset]);
            $rows = DB::select($dataQuery, $dataBindings);

            // Eager-like fetching of modalities and stats for the paginated rows
            foreach ($rows as &$row) {
                // Fetch modalities
                $row->modalidades = DB::select("
                    SELECT direccion_area, nivel_educativo, sector 
                    FROM modalidades 
                    WHERE establecimiento_id = ? AND ambito = 'PUBLICO' AND deleted_at IS NULL
                ", [$row->id]);

                // Fetch all cargos for this CUE to calculate audit stats
                $cargos = DB::select("
                    SELECT dni, cupof, situacion_revista
                    FROM agente_cargos
                    WHERE cue = ? AND anio = ? AND cupof IS NOT NULL AND cupof != ''
                ", [$row->cue, $year]);

                $dnis = array_values(array_unique(array_filter(array_column($cargos, 'dni'))));
                $licenciasByDni = [];
                if (!empty($dnis)) {
                    $placeholders = implode(',', array_fill(0, count($dnis), '?'));
                    $today = Carbon::today()->setYear($year)->format('Y-m-d');
                    $lics = DB::select("
                        SELECT DISTINCT dni
                        FROM licencias
                        WHERE fecha_inicio <= ? AND fecha_fin >= ? AND dni IN ({$placeholders})
                    ", array_merge([$today, $today], $dnis));
                    
                    foreach ($lics as $lic) {
                        $licenciasByDni[$lic->dni] = true;
                    }
                }

                $cupofs = [];
                foreach ($cargos as $c) {
                    $c->tiene_licencia = isset($licenciasByDni[$c->dni]);
                    $cupofs[$c->cupof][] = $c;
                }

                $row->cupof_count = count($cupofs);
                $row->agent_count = count($dnis);
                $covered = 0;
                $extraAgents = 0;

                foreach ($cupofs as $code => $agents) {
                    $count = count($agents);
                    if ($count === 1) {
                        $agent = $agents[0];
                        if (!$agent->tiene_licencia) {
                            $covered++;
                        }
                    } else {
                        $activeCount = 0;
                        $replacementsCount = 0;
                        foreach ($agents as $agent) {
                            $rev = strtoupper($agent->situacion_revista ?? '');
                            if ($rev === 'SUPLENTE' || $rev === 'REEMPLAZANTE') {
                                $replacementsCount++;
                            }
                            if (!$agent->tiene_licencia) {
                                $activeCount++;
                            }
                        }
                        
                        $extraAgents += $replacementsCount;
                        
                        if ($activeCount > 0) {
                            $covered++;
                        }
                    }
                }

                $row->covered_count = $covered;
                $row->uncovered_count = $row->cupof_count - $covered;
                $row->extra_agents_count = $extraAgents;
                $row->coverage_percent = $row->cupof_count > 0 ? (int)round(($covered / $row->cupof_count) * 100) : 0;
            }
            unset($row);

            return response()->json([
                'data' => $rows,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get unique filters options from the database.
     */
    public function getFilters()
    {
        try {
            $direcciones = DB::select("
                SELECT DISTINCT direccion_area 
                FROM modalidades 
                WHERE direccion_area IS NOT NULL AND direccion_area != '' AND ambito = 'PUBLICO' AND deleted_at IS NULL 
                ORDER BY direccion_area ASC
            ");
            $niveles = DB::select("
                SELECT DISTINCT nivel_educativo 
                FROM modalidades 
                WHERE nivel_educativo IS NOT NULL AND nivel_educativo != '' AND ambito = 'PUBLICO' AND deleted_at IS NULL 
                ORDER BY nivel_educativo ASC
            ");
            $departamentos = DB::select("
                SELECT DISTINCT ed.zona_departamento 
                FROM edificios ed
                JOIN establecimientos e ON e.edificio_id = ed.id
                JOIN modalidades m ON m.establecimiento_id = e.id
                WHERE ed.zona_departamento IS NOT NULL AND ed.zona_departamento != '' 
                  AND ed.deleted_at IS NULL AND e.deleted_at IS NULL AND m.deleted_at IS NULL
                  AND m.ambito = 'PUBLICO'
                ORDER BY ed.zona_departamento ASC
            ");

            return response()->json([
                'direcciones' => array_column($direcciones, 'direccion_area'),
                'niveles' => array_column($niveles, 'nivel_educativo'),
                'departamentos' => array_column($departamentos, 'zona_departamento')
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get detailed info of a single establishment, including its modalities and CUPOF hierarchy.
     */
    public function detail($id, Request $request)
    {
        try {
            $year = (int)$request->input('year');
            if (!$year) {
                $latestYearRow = DB::selectOne("SELECT MAX(anio) as max_year FROM agente_cargos");
                $year = $latestYearRow && $latestYearRow->max_year ? (int)$latestYearRow->max_year : 2026;
            }

            // Fetch establishment details
            $est = DB::selectOne("
                SELECT e.*, ed.cui, ed.calle, ed.numero_puerta, ed.codigo_postal, ed.localidad, 
                       ed.zona_departamento, ed.latitud, ed.longitud, ed.te_voip, ed.letra_zona,
                       ed.punto_partida, ed.dist_circunf, ed.radio_circ, ed.distancia_camino, 
                       ed.radio_camino, ed.tiempo_google_auto, ed.observacion
                FROM establecimientos e
                LEFT JOIN edificios ed ON e.edificio_id = ed.id
                WHERE e.id = ? AND e.deleted_at IS NULL
            ", [$id]);

            if (!$est) {
                return response()->json(['error' => 'Establecimiento no encontrado'], 404);
            }

            // Fetch modalities
            $est->modalidades = DB::select("
                SELECT * 
                FROM modalidades 
                WHERE establecimiento_id = ? AND ambito = 'PUBLICO' AND deleted_at IS NULL
            ", [$est->id]);

            // Fetch all cargos for this CUE and year
            $cargos = DB::select("
                SELECT ac.id, ac.dni, ac.centro, ac.establecimiento, ac.escalafon, ac.cupof, ac.cue,
                       ac.cargo_horas, ac.horas_catedra, ac.turno, ac.plan_estudio,
                       ac.situacion_revista, ac.norma_legal, ac.observaciones
                FROM agente_cargos ac
                WHERE ac.cue = ? AND ac.anio = ? AND ac.cupof IS NOT NULL AND ac.cupof != ''
            ", [$est->cue, $year]);

            // Get unique DNI list to fetch names and active licenses
            $dnis = array_values(array_unique(array_filter(array_column($cargos, 'dni'))));
            
            $agentsMap = [];
            $licenciasByDni = [];

            if (!empty($dnis)) {
                $placeholders = implode(',', array_fill(0, count($dnis), '?'));
                
                // Fetch agent names
                $agentsRows = DB::select("
                    SELECT dni, nombre_agente 
                    FROM agentes 
                    WHERE dni IN ({$placeholders})
                ", $dnis);
                foreach ($agentsRows as $a) {
                    $agentsMap[$a->dni] = $a->nombre_agente;
                }

                // Fetch active licencias for the year (checking date range active on today's reference date)
                $today = Carbon::today()->setYear($year);
                $todayStr = $today->format('Y-m-d');
                $lics = DB::select("
                    SELECT id, dni, tipo_licencia, fecha_inicio, fecha_fin, dias
                    FROM licencias
                    WHERE fecha_inicio <= ? AND fecha_fin >= ? AND dni IN ({$placeholders})
                ", array_merge([$todayStr, $todayStr], $dnis));
                
                foreach ($lics as $lic) {
                    $licenciasByDni[$lic->dni][] = $lic;
                }
            }

            // Group cargos by cupof
            $cupofsData = [];
            foreach ($cargos as $c) {
                $cupofCode = $c->cupof;
                
                // Map agent name
                $c->nombre_agente = $agentsMap[$c->dni] ?? 'S/D';

                // Check for licenses in the active year
                $agentLics = $licenciasByDni[$c->dni] ?? [];
                
                // Flag if license is currently active on a generic day of that year
                // (e.g. today is 2026-06-24, let's match active year)
                $today = Carbon::today()->setYear($year);
                $c->licencias = $agentLics;
                $c->tiene_licencia_activa = false;
                $c->licencia_activa_detalle = null;

                foreach ($agentLics as $lic) {
                    try {
                        $start = Carbon::parse($lic->fecha_inicio);
                        $end = Carbon::parse($lic->fecha_fin);
                        if ($start->lte($today) && $today->lte($end)) {
                            $c->tiene_licencia_activa = true;
                            $c->licencia_activa_detalle = $lic;
                            break;
                        }
                    } catch (\Exception $e) {}
                }

                if (!isset($cupofsData[$cupofCode])) {
                    $cupofsData[$cupofCode] = [
                        'cupof' => $cupofCode,
                        'cargo_horas' => $c->cargo_horas,
                        'horas_catedra' => $c->horas_catedra,
                        'turno' => $c->turno,
                        'plan_estudio' => $c->plan_estudio,
                        'agents' => []
                    ];
                }
                
                $cupofsData[$cupofCode]['agents'][] = $c;
            }

            // Structure hierarchical replacement chains for each CUPOF
            foreach ($cupofsData as $code => &$cupof) {
                $agents = $cupof['agents'];
                
                $titularesInterinos = [];
                $suplentes = [];
                $reemplazantes = [];
                $otros = [];

                foreach ($agents as $a) {
                    $rev = strtoupper($a->situacion_revista ?? '');
                    if ($rev === 'TITULAR' || $rev === 'INTERINO') {
                        $titularesInterinos[] = $a;
                    } elseif ($rev === 'SUPLENTE') {
                        $suplentes[] = $a;
                    } elseif ($rev === 'REEMPLAZANTE') {
                        $reemplazantes[] = $a;
                    } else {
                        $otros[] = $a;
                    }
                }

                $cupof['hierarchy'] = [
                    'titulares_interinos' => $titularesInterinos,
                    'suplentes' => $suplentes,
                    'reemplazantes' => $reemplazantes,
                    'otros' => $otros
                ];
            }
            unset($cupof);

            return response()->json([
                'establecimiento' => $est,
                'cupofs' => array_values($cupofsData)
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
