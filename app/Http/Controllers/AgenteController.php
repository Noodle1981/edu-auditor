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

    public function auditoriaUnicaPage()
    {
        return Inertia::render('AuditoriaUnica');
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

            $totalHoras = (int)$profile['total_horas_catedra'];
            $tieneLicencia = count($activeLics) > 0;
            
            $horasLicenciadas = $tieneLicencia ? $totalHoras : 0;
            $horasActivasNetas = $tieneLicencia ? 0 : $totalHoras;
            
            $statusAuditoria = 'regular';
            if ($totalHoras > self::MAX_HOURS_THRESHOLD) {
                $statusAuditoria = $tieneLicencia ? 'exceso_justificado' : 'incompatibilidad_critica';
            }

            $profile['auditoria'] = [
                'alerta_incompatibilidad_horas' => $totalHoras > self::MAX_HOURS_THRESHOLD,
                'alerta_multi_cargo' => $profile['cargos_count'] > 1,
                'licencias_activas' => $activeLics,
                'tiene_licencia_activa' => $tieneLicencia,
                'horas_licenciadas' => $horasLicenciadas,
                'horas_activas_netas' => $horasActivasNetas,
                'status_auditoria' => $statusAuditoria,
                'coincide_en_designaciones' => count($profile['designaciones']) > 0,
                'requiere_auditoria_af' => ($totalHoras > self::MAX_HOURS_THRESHOLD) || ($profile['cargos_count'] > 1) || $tieneLicencia
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
            ", [self::MAX_HOURS_THRESHOLD]);

            $today = Carbon::today();
            foreach ($excesoHoras as $item) {
                $licencias = DB::select("
                    SELECT fecha_inicio, fecha_fin
                    FROM licencias
                    WHERE dni = ?
                ", [$item->dni]);
                
                $tieneLicenciaActiva = false;
                foreach ($licencias as $lic) {
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
                            $tieneLicenciaActiva = true;
                            break;
                        }
                    } catch (\Exception $e) {
                        // skip
                    }
                }
                $item->tiene_licencia_activa = $tieneLicenciaActiva;
                $item->status_auditoria = $tieneLicenciaActiva ? 'exceso_justificado' : 'incompatibilidad_critica';
            }

            // 2. Multi-cargos (cargos >= 3 and hours = 0)
            $multiCargos = DB::select("
                SELECT a.dni, a.nombre_agente, a.legajo, COUNT(c.id) as cargos_activos, SUM(c.horas_catedra) as total_horas
                FROM agentes a
                JOIN agente_cargos c ON a.dni = c.dni
                GROUP BY a.dni, a.nombre_agente, a.legajo
                HAVING cargos_activos >= 3 AND total_horas = 0
                ORDER BY cargos_activos DESC
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

    public function auditoriaAutomatizadaPage()
    {
        return Inertia::render('AuditoriaAutomatizada');
    }

    public function getLocalAnalysis($dni)
    {
        try {
            $agentInfo = DB::selectOne("SELECT dni, nombre_agente, genero, legajo, fecha_alta FROM agentes WHERE dni = ?", [$dni]);
            if (!$agentInfo) {
                return response()->json(['error' => 'No se encontró ningún agente con el DNI ingresado.'], 404);
            }

            $cargos = DB::select("
                SELECT centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, situacion_revista, norma_legal, observaciones
                FROM agente_cargos 
                WHERE dni = ?
            ", [$dni]);

            $designaciones = DB::select("
                SELECT centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, situacion_revista, norma_legal, observaciones
                FROM designaciones 
                WHERE dni = ?
            ", [$dni]);

            $licencias = DB::select("
                SELECT id_tramite, fecha_carga, tipo_licencia, fecha_inicio, fecha_fin, dias, documento_respaldo
                FROM licencias 
                WHERE dni = ?
            ", [$dni]);

            // Fetch physical school details
            $cues = [];
            foreach ($cargos as $c) {
                if ($c->cue !== null) $cues[] = $c->cue;
            }
            $cues = array_unique($cues);

            $escuelasFisicas = [];
            if (!empty($cues)) {
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

            // Perform calculations
            $totalRealHours = 0;
            $totalEstimatedHours = 0;
            $cargosDetalles = [];

            foreach ($cargos as $idx => $c) {
                $horas = (int)$c->horas_catedra;
                $totalRealHours += $horas;

                // Estimate hours if 0 (e.g. Maestro de Grado)
                $estHoras = $horas;
                $motivoEstimacion = '';
                if ($horas === 0) {
                    $desc = strtolower(($c->cargo_horas ?: '') . ' ' . ($c->plan_estudio ?: ''));
                    if (str_contains($desc, 'extendida')) {
                        $estHoras = 35;
                        $motivoEstimacion = '(Estimado: Jornada Extendida)';
                    } elseif (str_contains($desc, 'completa') || str_contains($desc, 'completo')) {
                        $estHoras = 40;
                        $motivoEstimacion = '(Estimado: Jornada Completa)';
                    } elseif (str_contains($desc, 'simple')) {
                        $estHoras = 20;
                        $motivoEstimacion = '(Estimado: Jornada Simple)';
                    } else {
                        $estHoras = 20;
                        $motivoEstimacion = '(Estimado por defecto)';
                    }
                }
                $totalEstimatedHours += $estHoras;

                $cargosDetalles[] = [
                    'cargo' => $c->cargo_horas ?: 'Cargo no especificado',
                    'escuela' => $c->establecimiento ?: 'Escuela no especificada',
                    'cue' => $c->cue,
                    'turno' => $c->turno ?: 'No especificado',
                    'horas_reales' => $horas,
                    'horas_estimadas' => $estHoras,
                    'motivo_estimacion' => $motivoEstimacion,
                    'situacion_revista' => $c->situacion_revista ?: 'No especificada',
                ];
            }

            // Check active licenses
            $activeLics = [];
            $today = Carbon::today();
            foreach ($licencias as $lic) {
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
            
            $tieneLicencia = count($activeLics) > 0;
            $horasLicenciadas = $tieneLicencia ? $totalEstimatedHours : 0;
            $horasActivasNetas = $tieneLicencia ? 0 : $totalEstimatedHours;
            
            $statusAuditoria = 'regular';
            if ($totalEstimatedHours > self::MAX_HOURS_THRESHOLD) {
                $statusAuditoria = $tieneLicencia ? 'exceso_justificado' : 'incompatibilidad_critica';
            }

            // Incompatibilidades
            $incompHoraria = $totalEstimatedHours > 50;

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
                        $distStr = number_format($dist, 2) . " km";
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
                $alta = \Carbon\Carbon::parse($agentInfo->fecha_alta);
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
                    $cargosNombres = implode(" y ", array_map(fn($item) => "'{$item->cargo_horas}' en '{$item->establecimiento}'", $list));
                    $discrepancias[] = "Posible superposición horaria directa: El docente posee **" . count($list) . "** cargos en el **Turno " . ucfirst($t) . "** ({$cargosNombres}).";
                }
            }

            // 3. Cargos sin coincidencia en designaciones
            if (count($cargos) !== count($designaciones)) {
                $discrepancias[] = "Discrepancia en registros de cargos: Se registran **" . count($cargos) . "** cargos activos en planta pero figuran **" . count($designaciones) . "** designaciones históricas en el sistema.";
            }

            // Generate report in Markdown
            $hoy = \Carbon\Carbon::now()->locale('es')->isoFormat('D [de] MMMM [de] YYYY');
            $nombre = e($agentInfo->nombre_agente);
            $dniDoc = number_format((int)$dni, 0, ',', '.');
            
            $markdown = "*MINISTERIO DE EDUCACIÓN\n";
            $markdown .= "*AUDITORÍA INTERNA DE RECURSOS HUMANOS DOCENTES\n";
            $markdown .= "*INFORME DE AUDITORÍA LOCAL (REGLADO - LOCAL)\n";
            $markdown .= "*Número de Informe: AUDIRH-LOCAL-" . date('Y') . "-{$dni}\n";
            $markdown .= "*Fecha: {$hoy}\n";
            $markdown .= "*Dirigido a: Dirección de Recursos Humanos Docentes\n";
            $markdown .= "*De: Departamento de Auditoría y Control de Gestión\n";
            $markdown .= "*Asunto: Auditoría de Perfil Docente – Agente {$nombre} (DNI: {$dniDoc})\n";
            $markdown .= "--\n\n";

            $markdown .= "*1. INTRODUCCIÓN\n";
            $markdown .= "El presente informe detalla los hallazgos de la auditoría local reglada realizada sobre el perfil laboral del agente **{$nombre}**, con DNI **{$dniDoc}** y Legajo **{$agentInfo->legajo}**, a partir de los datos registrados en la base de datos del Ministerio de Educación. El objetivo es identificar de manera inmediata incompatibilidades horarias, riesgos geográficos por dispersión y discrepancias en los registros administrativos.\n\n";

            $markdown .= "*2. DATOS DEL AGENTE AUDITADO\n";
            $markdown .= "DNI: **{$agentInfo->dni}**\n";
            $markdown .= "Nombre Completo: **{$nombre}**\n";
            $markdown .= "Género: **" . ($agentInfo->genero === 'F' ? 'Femenino' : 'Masculino') . "**\n";
            $markdown .= "Legajo: **" . ($agentInfo->legajo ?: 'Sin legajo') . "**\n";
            $markdown .= "Fecha de Alta Registrada: **" . ($agentInfo->fecha_alta ? date('d/m/Y', strtotime($agentInfo->fecha_alta)) : 'No registrada') . "**\n";
            $markdown .= "Total de Cargos Activos Registrados: **" . count($cargos) . "**\n";
            $markdown .= "Total de Horas Cátedra Registradas: **{$totalRealHours} hs** (Equivalentes estimadas: **{$totalEstimatedHours} hs**)\n";
            $markdown .= "Horas Licenciadas (Activas Hoy): **{$horasLicenciadas} hs**\n";
            $markdown .= "Horas Activas Netas (Trabajo Efectivo): **{$horasActivasNetas} hs**\n";
            
            if ($statusAuditoria === 'regular') {
                $markdown .= "Estado de Compatibilidad: ✅ **REGULAR** (Cumple la normativa de límite de 50 hs)\n\n";
            } elseif ($statusAuditoria === 'exceso_justificado') {
                $markdown .= "Estado de Compatibilidad: 🟨 **EXCESO JUSTIFICADO** (Supera 50 hs registradas, pero cuenta con licencias vigentes hoy que reducen su carga activa)\n\n";
            } else {
                $markdown .= "Estado de Compatibilidad: ❌ **INCOMPATIBILIDAD CRÍTICA** (Supera 50 hs semanales de forma activa sin licencias vigentes hoy)\n\n";
            }

            $markdown .= "*3. HALLAZGOS DETALLADOS\n";
            
            // 3.1 Incompatibilidades Horarias
            $markdown .= "*3.1. Incompatibilidades Horarias Críticas (Límite de 50 horas semanales)\n";
            if ($statusAuditoria === 'incompatibilidad_critica') {
                $markdown .= "⚠️ **ALERTA CRÍTICA**: La carga horaria activa neta del agente (**{$horasActivasNetas} horas semanales**) supera el límite legal de 50 horas sin justificación de licencia activa hoy.\n\n";
            } elseif ($statusAuditoria === 'exceso_justificado') {
                $markdown .= "ℹ️ **EXCESO REGULARIZADO**: El agente registra un total de **{$totalEstimatedHours} horas**, pero al poseer licencias vigentes hoy, sus horas activas netas son **{$horasActivasNetas} horas**, regularizando su carga de trabajo efectivo frente a alumnos.\n\n";
            } else {
                $markdown .= "✅ **SITUACIÓN REGULAR**: La carga horaria activa (**{$horasActivasNetas} horas semanales**) se encuentra dentro del límite legal permitido de 50 horas.\n\n";
            }
            
            foreach ($cargosDetalles as $idx => $cd) {
                $num = $idx + 1;
                $markdown .= "**Cargo {$num}**: {$cd['cargo']} en *{$cd['escuela']}* (CUE: {$cd['cue']}).\n";
                $markdown .= "- Turno: *{$cd['turno']}*\n";
                $markdown .= "- Carga horaria: **{$cd['horas_reales']} hs** {$cd['motivo_estimacion']}\n";
                $markdown .= "- Situación de Revista: *{$cd['situacion_revista']}*\n\n";
            }

            // 3.2 Geo Dispersion
            $markdown .= "*3.2. Riesgo de Superposición por Dispersión Geográfica\n";
            if ($numEscuelas > 1) {
                $markdown .= "El agente desempeña funciones en **{$numEscuelas}** establecimientos educativos diferentes.\n";
                foreach ($distanciaComentarios as $dc) {
                    $markdown .= "{$dc}\n";
                }
                if ($highRiskGeo) {
                    $markdown .= "⚠️ **ALERTA DE RIESGO GEOGRÁFICO**: Se detectan distancias mayores a 10 km entre escuelas, lo que sumado a los turnos de desempeño genera un riesgo crítico de ausentismo o tardanzas debido a tiempos de traslado suficientes.\n\n";
                } else {
                    $markdown .= "✅ **SITUACIÓN GEOGRÁFICA**: Las distancias entre las escuelas de desempeño son bajas o moderadas, permitiendo traslados seguros entre jornadas.\n\n";
                }
            } else {
                $markdown .= "✅ No hay dispersión geográfica ya que el agente trabaja en un único establecimiento educativo.\n\n";
            }

            // 3.3 Discrepancias
            $markdown .= "*3.3. Discrepancias Administrativas\n";
            if (count($discrepancias) > 0) {
                foreach ($discrepancias as $d) {
                    $markdown .= "- {$d}\n";
                }
            } else {
                $markdown .= "✅ No se han detectado discrepancias administrativas en los registros analizados.\n";
            }
            $markdown .= "\n";

            // 4. Conclusiones
            $markdown .= "*4. CONCLUSIONES GENERALES\n";
            if ($incompHoraria || $highRiskGeo || count($discrepancias) > 0) {
                $markdown .= "El perfil del agente presenta irregularidades que requieren intervención de Recursos Humanos. ";
                if ($incompHoraria) {
                    $markdown .= "Existe incompatibilidad horaria severa por superación del límite de 50 horas. ";
                }
                if ($highRiskGeo) {
                    $markdown .= "Existe riesgo geográfico por dispersión escolar relevante. ";
                }
                if (count($discrepancias) > 0) {
                    $markdown .= "Se observan discrepancias en los turnos y/o fechas administrativas registradas.";
                }
            } else {
                $markdown .= "El perfil auditado se encuentra en estado regular y cumple con las normativas horarias y geográficas del Ministerio de Educación.";
            }
            $markdown .= "\n\n";

            // 5. Recomendaciones
            $markdown .= "*5. SUGERENCIAS Y ACCIONES RECOMENDADAS PARA EL ÁREA DE RECURSOS HUMANOS\n";
            $markdown .= "*5.1. Acciones Inmediatas y Específicas del Caso:\n";
            if ($statusAuditoria === 'incompatibilidad_critica') {
                $markdown .= "- **Citar de urgencia al docente** para que efectúe la opción por cargo y regularice su situación horaria excedida de forma activa (opción por cargos hasta un máximo de 50 hs).\n";
            } elseif ($statusAuditoria === 'exceso_justificado') {
                $markdown .= "- **Monitorear la vigencia y renovación de las licencias activas** (ej. plazos, justificaciones de licencias de largo tratamiento o cargo de mayor jerarquía).\n";
                $markdown .= "- **Auditar la carga efectiva y suplencias** en los establecimientos donde el docente tiene licencia para asegurar la cobertura regular de clases.\n";
            }
            if ($highRiskGeo) {
                $markdown .= "- **Revisar hojas de asistencia firmadas** de los establecimientos involucrados para verificar el cumplimiento efectivo de horarios de entrada y salida.\n";
            }
            if (count($discrepancias) > 0) {
                $markdown .= "- **Corregir y validar las discrepancias de registro** (fechas de alta futuras, designaciones históricas redundantes o turnos cruzados) en el sistema SIAME.\n";
            }
            if ($statusAuditoria === 'regular' && !$highRiskGeo && count($discrepancias) === 0) {
                $markdown .= "- Mantener el perfil en estado activo y archivar el reporte de auditoría preventiva.\n";
            }
            $markdown .= "\n";
            $markdown .= "*5.2. Acciones de Política y Procedimiento:\n";
            $markdown .= "- Reforzar los controles automáticos de carga horaria en el sistema SIAME al momento de registrar una nueva designación para alertar antes de la confirmación.\n";
            $markdown .= "- Estandarizar la carga de equivalencias horarias para cargos de jornada completa y extendida.\n\n";

            $markdown .= "--\n";
            $markdown .= "Sin otro particular, se remite este reporte local automatizado para el inicio de las acciones administrativas de control correspondientes.\n\n";
            $markdown .= "Atentamente,\n\n";
            $markdown .= "[Firma Digital del Sistema Local SIAME]\n";
            $markdown .= "*Departamento de Auditoría y Control de Gestión\n";
            $markdown .= "*Ministerio de Educación\n";

            return response()->json([
                'report' => $markdown,
                'agent' => [
                    'dni' => $agentInfo->dni,
                    'nombre_agente' => $agentInfo->nombre_agente
                ]
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
        $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        return $earthRadius * $c;
    }

    private function getAgentConsolidatedData($dni)
    {
        $agentInfo = DB::selectOne("SELECT dni, nombre_agente, genero, legajo, fecha_alta FROM agentes WHERE dni = ?", [$dni]);
        if (!$agentInfo) return null;

        $cargos = DB::select("
            SELECT centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                   turno, plan_estudio, situacion_revista, norma_legal, observaciones
            FROM agente_cargos 
            WHERE dni = ?
        ", [$dni]);

        $designaciones = DB::select("
            SELECT centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                   turno, plan_estudio, situacion_revista, norma_legal, observaciones
            FROM designaciones 
            WHERE dni = ?
        ", [$dni]);

        $licencias = DB::select("
            SELECT id_tramite, fecha_carga, tipo_licencia, fecha_inicio, fecha_fin, dias, documento_respaldo
            FROM licencias 
            WHERE dni = ?
        ", [$dni]);

        return [
            'dni' => $agentInfo->dni,
            'nombre_agente' => $agentInfo->nombre_agente,
            'genero' => $agentInfo->genero,
            'legajo' => $agentInfo->legajo,
            'fecha_alta' => $agentInfo->fecha_alta,
            'total_cargos_activos' => count($cargos),
            'total_horas_catedra' => array_sum(array_map(fn($c) => (int)$c->horas_catedra, $cargos)),
            'cargos_activos' => $cargos,
            'designaciones' => $designaciones,
            'licencias' => $licencias
        ];
    }
}
