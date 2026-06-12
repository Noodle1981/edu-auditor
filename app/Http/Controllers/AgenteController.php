<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class AgenteController extends Controller
{
    public const MAX_HOURS_THRESHOLD = 50;

    public function index()
    {
        return Inertia::render('Agentes');
    }

    public function search(Request $request)
    {
        try {
            $search = trim($request->input('search', ''));
            $revista = strtoupper(trim($request->input('revista', '')));
            $escalafon = strtoupper(trim($request->input('escalafon', '')));
            $turno = strtoupper(trim($request->input('turno', '')));
            $cue = trim($request->input('cue', ''));
            $normaLegal = trim($request->input('norma_legal', ''));

            $page = (int)$request->input('page', 1);
            $limit = (int)$request->input('limit', 20);

            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 20;
            $offset = ($page - 1) * $limit;

            // Build queries dynamically
            $bindings = [];
            $whereClause = "WHERE 1=1";

            if ($search !== '') {
                $whereClause .= " AND (a.dni LIKE ? OR a.nombre_agente LIKE ? OR a.legajo LIKE ?)";
                $searchLike = "%{$search}%";
                array_push($bindings, $searchLike, $searchLike, $searchLike);
            }

            if ($revista !== '') {
                $whereClause .= " AND c.situacion_revista = ?";
                $bindings[] = $revista;
            }

            if ($escalafon !== '') {
                $whereClause .= " AND c.escalafon = ?";
                $bindings[] = $escalafon;
            }

            if ($turno !== '') {
                $whereClause .= " AND c.turno = ?";
                $bindings[] = $turno;
            }

            if ($cue !== '') {
                if (ctype_digit($cue)) {
                    $whereClause .= " AND c.cue = ?";
                    $bindings[] = (int)$cue;
                }
            }

            if ($normaLegal !== '') {
                $whereClause .= " AND c.norma_legal LIKE ?";
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
            $totalUnicos = $countResult ? (int)$countResult->total_unicos : 0;

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

            $data = [];
            foreach ($rows as $r) {
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
                    'cargos_activos' => (int)$r->cargos_activos,
                    'total_horas_catedra' => (int)$r->total_horas_catedra,
                    'escuelas' => $escuelas
                ];
            }

            return response()->json([
                'data' => $data,
                'total' => $totalUnicos,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($totalUnicos / $limit)
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function detail($dni)
    {
        try {
            if (!$dni) {
                return response()->json(['error' => 'DNI is required'], 400);
            }

            // 1. Fetch parent agent info
            $agentInfo = DB::selectOne("SELECT dni, nombre_agente, genero, legajo, fecha_alta FROM agentes WHERE dni = ?", [$dni]);
            if (!$agentInfo) {
                return response()->json(['error' => 'Agent not found in unified database'], 404);
            }

            // 2. Fetch active cargos
            $rowsAgentes = DB::select("
                SELECT id, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, situacion_revista, norma_legal, observaciones, control_id 
                FROM agente_cargos 
                WHERE dni = ?
                ORDER BY id DESC
            ", [$dni]);

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
                'total_horas_catedra' => array_sum(array_map(fn($r) => (int)$r->horas_catedra, $rowsAgentes)),
                'cargos' => $rowsAgentes
            ];

            // 2. Fetch designaciones
            $rowsDesig = DB::select("
                SELECT id, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, nombre_agente, dni, genero, legajo, 
                       fecha_alta, situacion_revista, norma_legal, observaciones, control_id 
                FROM designaciones 
                WHERE dni = ?
                ORDER BY fecha_alta DESC
            ", [$dni]);
            $profile['designaciones'] = $rowsDesig;

            // Collect unique CUEs
            $cues = [];
            foreach ($rowsAgentes as $r) {
                if ($r->cue !== null) $cues[] = $r->cue;
            }
            foreach ($rowsDesig as $r) {
                if ($r->cue !== null) $cues[] = $r->cue;
            }
            $cues = array_unique($cues);

            // 3. Fetch licencias
            $rowsLic = DB::select("
                SELECT id, id_tramite, fecha_carga, nombre_agente, dni, genero,
                       tipo_licencia, documento_respaldo, fecha_inicio, fecha_fin, dias, referencia_interna
                FROM licencias 
                WHERE dni = ?
                ORDER BY fecha_inicio DESC
            ", [$dni]);
            $profile['licencias'] = $rowsLic;

            // 4. Fetch escuelas info
            $profile['escuelas_fisicas'] = (object)[];
            if (!empty($cues)) {
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
                $profile['escuelas_fisicas'] = (object)$escuelasFisicas;
            }

            // 5. Automated Audit (Active licenses)
            $activeLics = [];
            $today = Carbon::today();
            foreach ($profile['licencias'] as $lic) {
                try {
                    $startStr = $lic->fecha_inicio;
                    $endStr = $lic->fecha_fin;

                    $parseDate = function($dateStr) {
                        if (str_contains($dateStr, '/')) {
                            $p = array_map('intval', explode('/', $dateStr));
                            if ($p[2] < 100) $p[2] += 2000;
                            return Carbon::create($p[2], $p[1], $p[0]);
                        } elseif (str_contains($dateStr, '-')) {
                            $p = array_map('intval', explode('-', $dateStr));
                            if ($p[0] < 100) $p[0] += 2000;
                            return Carbon::create($p[0], $p[1], $p[2]);
                        }
                        return null;
                    };

                    $startDate = $parseDate($startStr);
                    $endDate = $parseDate($endStr);

                    if ($startDate && $endDate && $startDate->lte($today) && $today->lte($endDate)) {
                        $activeLics[] = $lic;
                    }
                } catch (\Exception $e) {
                    // skip
                }
            }

            $profile['auditoria'] = [
                'alerta_incompatibilidad_horas' => $profile['total_horas_catedra'] > self::MAX_HOURS_THRESHOLD,
                'alerta_multi_cargo' => $profile['cargos_count'] > 1,
                'licencias_activas' => $activeLics,
                'tiene_licencia_activa' => count($activeLics) > 0,
                'coincide_en_designaciones' => count($profile['designaciones']) > 0,
                'requiere_auditoria_af' => ($profile['total_horas_catedra'] > self::MAX_HOURS_THRESHOLD) || ($profile['cargos_count'] > 1) || (count($activeLics) > 0)
            ];

            return response()->json($profile);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function auditorias()
    {
        try {
            // 1. Excess hours (> self::MAX_HOURS_THRESHOLD)
            $excesoHoras = DB::select("
                SELECT a.dni, a.nombre_agente, a.legajo, COUNT(c.id) as cargos_activos, SUM(c.horas_catedra) as total_horas
                FROM agentes a
                JOIN agente_cargos c ON a.dni = c.dni
                GROUP BY a.dni, a.nombre_agente, a.legajo
                HAVING total_horas > ?
                ORDER BY total_horas DESC
                LIMIT 15
            ", [self::MAX_HOURS_THRESHOLD]);

            // 2. Multi-cargos (cargos >= 3 and hours = 0)
            $multiCargos = DB::select("
                SELECT a.dni, a.nombre_agente, a.legajo, COUNT(c.id) as cargos_activos, SUM(c.horas_catedra) as total_horas
                FROM agentes a
                JOIN agente_cargos c ON a.dni = c.dni
                GROUP BY a.dni, a.nombre_agente, a.legajo
                HAVING cargos_activos >= 3 AND total_horas = 0
                ORDER BY cargos_activos DESC
                LIMIT 15
            ");

            // 3. Recent licenses
            $licenciasRecientes = DB::select("
                SELECT id, dni, nombre_agente, tipo_licencia, fecha_inicio, fecha_fin, dias
                FROM licencias
                ORDER BY id DESC
                LIMIT 15
            ");

            // 4. Metrics calculation for dynamic audit panel
            $totalAgentes = DB::table('agentes')->count();
            $huerfanosCount = DB::selectOne("SELECT COUNT(*) as count FROM agentes WHERE legajo IS NULL OR legajo = ''")->count;
            $calidadIntegracion = $totalAgentes > 0 ? (1 - ($huerfanosCount / $totalAgentes)) * 100 : 100;

            $totalExcesoCount = DB::selectOne("
                SELECT COUNT(*) as count 
                FROM (
                    SELECT dni 
                    FROM agente_cargos 
                    GROUP BY dni 
                    HAVING SUM(horas_catedra) > ?
                )
            ", [self::MAX_HOURS_THRESHOLD])->count;

            $totalMultiCargosCount = DB::selectOne("
                SELECT COUNT(*) as count 
                FROM (
                    SELECT dni 
                    FROM agente_cargos 
                    GROUP BY dni 
                    HAVING COUNT(id) >= 3 AND SUM(horas_catedra) = 0
                )
            ")->count;

            return response()->json([
                'exceso_horas' => $excesoHoras,
                'multi_cargos_fijos' => $multiCargos,
                'licencias_recientes' => $licenciasRecientes,
                'calidad_integracion' => round($calidadIntegracion, 2),
                'huerfanos_count' => $huerfanosCount,
                'total_exceso' => $totalExcesoCount,
                'total_multi' => $totalMultiCargosCount
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
