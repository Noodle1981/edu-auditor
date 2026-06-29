<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

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

            $year = $this->getDefaultYear((int)$request->input('year'));

            $hideEmpty = $request->boolean('hide_empty', false);

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

            if ($hideEmpty) {
                $whereClauses[] = "EXISTS (
                    SELECT 1 FROM agente_cargos ac 
                    WHERE ac.cue = e.cue 
                      AND ac.anio = ? 
                      AND ac.cupof IS NOT NULL 
                      AND ac.cupof != ''
                )";
                $bindings[] = $year;
            }

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
                    SELECT direccion_area, nivel_educativo, sector, radio_justificado, inst_legal_radio 
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
                        SELECT dni, tipo_licencia
                        FROM licencias
                        WHERE fecha_inicio <= ? AND fecha_fin >= ? AND dni IN ({$placeholders})
                    ", array_merge([$today, $today], $dnis));
                    
                    foreach ($lics as $lic) {
                        $licenciasByDni[$lic->dni][] = $lic->tipo_licencia;
                    }
                }

                $cupofs = [];
                foreach ($cargos as $c) {
                    $c->licencias_tipos = $licenciasByDni[$c->dni] ?? [];
                    $c->tiene_licencia = !empty($c->licencias_tipos);
                    $cupofs[$c->cupof][] = $c;
                }

                foreach ($cupofs as $code => &$agents) {
                    // Sort agents hierarchically: TITULAR/INTERINO first, then SUPLENTE, then REEMPLAZANTE, then others.
                    usort($agents, function($a, $b) {
                        $order = ['TITULAR' => 1, 'INTERINO' => 1, 'SUPLENTE' => 2, 'REEMPLAZANTE' => 3];
                        $revA = strtoupper($a->situacion_revista ?? '');
                        $revB = strtoupper($b->situacion_revista ?? '');
                        $valA = $order[$revA] ?? 4;
                        $valB = $order[$revB] ?? 4;
                        return $valA <=> $valB;
                    });

                    $count = count($agents);
                    if ($count > 1) {
                        $lastAgent = $agents[$count - 1];
                        $revLast = strtoupper($lastAgent->situacion_revista ?? '');
                        if ($lastAgent->tiene_licencia && ($revLast === 'SUPLENTE' || $revLast === 'REEMPLAZANTE')) {
                            $hasMayorJerarquia = false;
                            foreach ($lastAgent->licencias_tipos as $tipo) {
                                if (stripos($tipo, 'MAYOR JERARQUÍA') !== false) {
                                    $hasMayorJerarquia = true;
                                    break;
                                }
                            }
                            if ($hasMayorJerarquia) {
                                $lastAgent->tiene_licencia = false;
                            }
                        }
                    }
                }
                unset($agents);

                $row->cupof_count = count($cupofs);
                
                $uniqueDnis = [];
                $activeDnis = [];
                foreach ($cupofs as $code => $agents) {
                    foreach ($agents as $agent) {
                        if ($agent->dni) {
                            $uniqueDnis[$agent->dni] = true;
                            if (!$agent->tiene_licencia) {
                                $activeDnis[$agent->dni] = true;
                            }
                        }
                    }
                }
                $row->agent_count = count($uniqueDnis);
                $row->active_agents_count = count($activeDnis);
                $row->licensed_agents_count = $row->agent_count - $row->active_agents_count;
                $row->relacion_planta_percent = $row->cupof_count > 0 ? (int)round(($row->agent_count / $row->cupof_count) * 100) : 0;

                $covered = 0;
                $extraAgents = 0;
                $reforzadosCount = 0;

                foreach ($cupofs as $code => $agents) {
                    $count = count($agents);
                    if ($count > 1) {
                        $reforzadosCount++;
                    }
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
                $row->reforzados_count = $reforzadosCount;
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
     * Export the filtered list of establishments to a PDF report.
     */
    public function exportPdf(Request $request)
    {
        try {
            $search = trim($request->input('search', ''));
            $direccionArea = trim($request->input('direccion_area', ''));
            $nivelEducativo = trim($request->input('nivel_educativo', ''));
            $departamento = trim($request->input('departamento', ''));

            $year = $this->getDefaultYear((int)$request->input('year'));

            $hideEmpty = $request->boolean('hide_empty', false);

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

            if ($hideEmpty) {
                $whereClauses[] = "EXISTS (
                    SELECT 1 FROM agente_cargos ac 
                    WHERE ac.cue = e.cue 
                      AND ac.anio = ? 
                      AND ac.cupof IS NOT NULL 
                      AND ac.cupof != ''
                )";
                $bindings[] = $year;
            }

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

            // Data query (fetching all records matching the filters, no pagination)
            $dataQuery = "
                SELECT e.id, e.cue, e.nombre, e.cue_edificio_principal, e.establecimiento_cabecera,
                       ed.zona_departamento as departamento, ed.localidad
                FROM establecimientos e
                LEFT JOIN edificios ed ON e.edificio_id = ed.id
                {$whereSql}
                ORDER BY e.nombre ASC
            ";
            $rows = DB::select($dataQuery, $bindings);

            // Fetch modalities and stats for all rows
            foreach ($rows as &$row) {
                // Fetch modalities
                $row->modalidades = DB::select("
                    SELECT direccion_area, nivel_educativo, sector, radio_justificado, inst_legal_radio 
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
                        SELECT dni, tipo_licencia
                        FROM licencias
                        WHERE fecha_inicio <= ? AND fecha_fin >= ? AND dni IN ({$placeholders})
                    ", array_merge([$today, $today], $dnis));
                    
                    foreach ($lics as $lic) {
                        $licenciasByDni[$lic->dni][] = $lic->tipo_licencia;
                    }
                }

                $cupofs = [];
                foreach ($cargos as $c) {
                    $c->licencias_tipos = $licenciasByDni[$c->dni] ?? [];
                    $c->tiene_licencia = !empty($c->licencias_tipos);
                    $cupofs[$c->cupof][] = $c;
                }

                foreach ($cupofs as $code => &$agents) {
                    // Sort agents hierarchically: TITULAR/INTERINO first, then SUPLENTE, then REEMPLAZANTE, then others.
                    usort($agents, function($a, $b) {
                        $order = ['TITULAR' => 1, 'INTERINO' => 1, 'SUPLENTE' => 2, 'REEMPLAZANTE' => 3];
                        $revA = strtoupper($a->situacion_revista ?? '');
                        $revB = strtoupper($b->situacion_revista ?? '');
                        $valA = $order[$revA] ?? 4;
                        $valB = $order[$revB] ?? 4;
                        return $valA <=> $valB;
                    });

                    $count = count($agents);
                    if ($count > 1) {
                        $lastAgent = $agents[$count - 1];
                        $revLast = strtoupper($lastAgent->situacion_revista ?? '');
                        if ($lastAgent->tiene_licencia && ($revLast === 'SUPLENTE' || $revLast === 'REEMPLAZANTE')) {
                            $hasMayorJerarquia = false;
                            foreach ($lastAgent->licencias_tipos as $tipo) {
                                if (stripos($tipo, 'MAYOR JERARQUÍA') !== false) {
                                    $hasMayorJerarquia = true;
                                    break;
                                }
                            }
                            if ($hasMayorJerarquia) {
                                $lastAgent->tiene_licencia = false;
                            }
                        }
                    }
                }
                unset($agents);

                $row->cupof_count = count($cupofs);
                
                $uniqueDnis = [];
                $activeDnis = [];
                foreach ($cupofs as $code => $agents) {
                    foreach ($agents as $agent) {
                        if ($agent->dni) {
                            $uniqueDnis[$agent->dni] = true;
                            if (!$agent->tiene_licencia) {
                                $activeDnis[$agent->dni] = true;
                            }
                        }
                    }
                }
                $row->agent_count = count($uniqueDnis);
                $row->active_agents_count = count($activeDnis);
                $row->licensed_agents_count = $row->agent_count - $row->active_agents_count;

                $covered = 0;
                $extraAgents = 0;
                $reforzadosCount = 0;

                foreach ($cupofs as $code => $agents) {
                    $count = count($agents);
                    if ($count > 1) {
                        $reforzadosCount++;
                    }
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
                $row->reforzados_count = $reforzadosCount;
                $row->coverage_percent = $row->cupof_count > 0 ? (int)round(($covered / $row->cupof_count) * 100) : 0;
                $row->relacion_planta_percent = $row->cupof_count > 0 ? (int)round(($row->agent_count / $row->cupof_count) * 100) : 0;
            }
            unset($row);

            $html = view('pdf.establecimientos', [
                'rows' => $rows,
                'filters' => [
                    'search' => $search,
                    'direccion_area' => $direccionArea,
                    'nivel_educativo' => $nivelEducativo,
                    'departamento' => $departamento,
                    'year' => $year,
                    'hide_empty' => $hideEmpty
                ],
                'generated_at' => Carbon::now()->format('d/m/Y H:i:s')
            ])->render();

            $pdf = Pdf::loadHTML($html);
            $pdf->setPaper('A4', 'landscape');
            return $pdf->download("reporte_establecimientos_{$year}.pdf");

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update the legal justification for the radio of an establishment's modalities.
     */
    public function updateRadio(Request $request, $id)
    {
        $request->validate([
            'radio_justificado' => 'required|boolean',
            'inst_legal_radio' => 'nullable|string|max:255'
        ]);

        $establecimiento = \App\Models\Establecimiento::find($id);
        if (!$establecimiento) {
            return response()->json(['error' => 'Establecimiento no encontrado'], 404);
        }

        // Update all modalities for this establishment
        \App\Models\Modalidad::where('establecimiento_id', $id)
            ->update([
                'radio_justificado' => $request->boolean('radio_justificado'),
                'inst_legal_radio' => $request->input('inst_legal_radio')
            ]);

        return response()->json(['message' => 'Radio validado/actualizado correctamente']);
    }

    /**
     * Get detailed info of a single establishment, including its modalities and CUPOF hierarchy.
     */
    public function detail($id, Request $request)
    {
        try {
            $year = $this->getDefaultYear((int)$request->input('year'));

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

    /**
     * Export a single establishment's details and hierarchy to PDF.
     */
    public function exportSinglePdf($id, Request $request)
    {
        try {
            $year = $this->getDefaultYear((int)$request->input('year'));

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
                abort(404, 'Establecimiento no encontrado');
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

                // Fetch active licencias for the year
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
                $c->nombre_agente = $agentsMap[$c->dni] ?? 'S/D';

                $agentLics = $licenciasByDni[$c->dni] ?? [];
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

            // Calculate Audit Summary (matching Establecimientos.jsx memo)
            $totalCupofs = count($cupofsData);
            $covered = 0;
            $uncoveredLicenseNoReplacement = 0;
            $uncoveredChainLicense = 0;
            $extraAgents = 0;
            
            $uniqueDnis = [];
            $uniqueActiveDnis = [];
            $uniqueLicensedDnis = [];
            $reforzadosCount = 0;

            foreach ($cupofsData as $code => $cupof) {
                $agents = $cupof['agents'];
                
                // Sort hierarchically
                $titulares = $cupof['hierarchy']['titulares_interinos'];
                $suplentes = $cupof['hierarchy']['suplentes'];
                $reemplazantes = $cupof['hierarchy']['reemplazantes'];
                $otros = $cupof['hierarchy']['otros'];
                $sorted = array_merge($titulares, $suplentes, $reemplazantes, $otros);

                $lastAgentReplacementLicenseDni = null;
                $sortedCount = count($sorted);
                if ($sortedCount > 1) {
                    $lastAgent = $sorted[$sortedCount - 1];
                    $revLast = strtoupper($lastAgent->situacion_revista ?? '');
                    if ($lastAgent->tiene_licencia_activa && 
                        ($revLast === 'SUPLENTE' || $revLast === 'REEMPLAZANTE') && 
                        $lastAgent->licencia_activa_detalle &&
                        stripos($lastAgent->licencia_activa_detalle->tipo_licencia ?? '', 'MAYOR JERARQUÍA') !== false) {
                        $lastAgentReplacementLicenseDni = $lastAgent->dni;
                    }
                }

                if (count($agents) > 1) {
                    $reforzadosCount++;
                }

                foreach ($agents as $a) {
                    if ($a->dni) {
                        $uniqueDnis[$a->dni] = true;
                        $isRealLicense = $a->tiene_licencia_activa && $a->dni !== $lastAgentReplacementLicenseDni;
                        if ($isRealLicense) {
                            $uniqueLicensedDnis[$a->dni] = true;
                        } else {
                            $uniqueActiveDnis[$a->dni] = true;
                        }
                    }
                }

                if (count($agents) === 1) {
                    $agent = $agents[0];
                    if ($agent->tiene_licencia_activa) {
                        $uncoveredLicenseNoReplacement++;
                    } else {
                        $covered++;
                    }
                } elseif (count($agents) > 1) {
                    $activeCount = 0;
                    $replacementsCount = 0;
                    foreach ($agents as $a) {
                        $rev = strtoupper($a->situacion_revista ?? '');
                        if ($rev === 'SUPLENTE' || $rev === 'REEMPLAZANTE') {
                            $replacementsCount++;
                        }
                        $isRealLicense = $a->tiene_licencia_activa && $a->dni !== $lastAgentReplacementLicenseDni;
                        if (!$isRealLicense) {
                            $activeCount++;
                        }
                    }
                    
                    $extraAgents += $replacementsCount;
                    if ($activeCount > 0) {
                        $covered++;
                    } else {
                        $uncoveredChainLicense++;
                    }
                }
            }

            $uncovered = $uncoveredLicenseNoReplacement + $uncoveredChainLicense;
            $coveragePercent = $totalCupofs > 0 ? (int)round(($covered / $totalCupofs) * 100) : 0;
            $totalAgents = count($uniqueDnis);
            $activeAgents = count($uniqueActiveDnis);
            $licensedAgents = $totalAgents - $activeAgents;
            $relacionPlantaPercent = $totalCupofs > 0 ? (int)round(($totalAgents / $totalCupofs) * 100) : 0;

            $summary = [
                'totalCupofs' => $totalCupofs,
                'covered' => $covered,
                'uncovered' => $uncovered,
                'extraAgents' => $extraAgents,
                'reforzadosCount' => $reforzadosCount,
                'totalAgents' => $totalAgents,
                'activeAgents' => $activeAgents,
                'licensedAgents' => $licensedAgents,
                'coveragePercent' => $coveragePercent,
                'relacionPlantaPercent' => $relacionPlantaPercent
            ];

            // Render view to PDF
            $html = view('pdf.establecimiento_detalle', [
                'est' => $est,
                'cupofs' => array_values($cupofsData),
                'summary' => $summary,
                'year' => $year,
                'generated_at' => Carbon::now()->format('d/m/Y H:i:s')
            ])->render();

            $pdf = Pdf::loadHTML($html);
            $pdf->setPaper('A4', 'portrait');
            return $pdf->download("detalle_escuela_{$est->cue}_{$year}.pdf");

        } catch (\Exception $e) {
            abort(500, $e->getMessage());
        }
    }
}
