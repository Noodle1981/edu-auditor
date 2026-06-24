<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TrasladosController extends Controller
{
    public function index()
    {
        return Inertia::render('Traslados');
    }

    public function audit(Request $request)
    {
        try {
            $year = (int)$request->query('year');
            if (!$year) {
                $latestYearRow = DB::selectOne("SELECT MAX(anio) as max_year FROM agente_cargos");
                $year = $latestYearRow && $latestYearRow->max_year ? (int)$latestYearRow->max_year : 2026;
            }

            // Find agents with multiple CUEs in agente_cargos
            $multiSchoolAgents = DB::select("
                SELECT c.dni, a.nombre_agente, COUNT(DISTINCT c.cue) as school_count
                FROM agente_cargos c
                JOIN agentes a ON c.dni = a.dni
                WHERE c.cue IS NOT NULL AND c.anio = ?
                GROUP BY c.dni, a.nombre_agente
                HAVING school_count > 1
                LIMIT 150
            ", [$year]);

            $auditResults = [];

            $haversine = function ($lat1, $lon1, $lat2, $lon2) {
                if ($lat1 === null || $lon1 === null || $lat2 === null || $lon2 === null) {
                    return null;
                }
                $lat1 = (float)$lat1;
                $lon1 = (float)$lon1;
                $lat2 = (float)$lat2;
                $lon2 = (float)$lon2;

                $R = 6371.0; // Earth radius in km
                $dLat = deg2rad($lat2 - $lat1);
                $dLon = deg2rad($lon2 - $lon1);
                
                $a = sin($dLat / 2) * sin($dLat / 2) +
                     cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
                     sin($dLon / 2) * sin($dLon / 2);
                     
                $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                return $R * $c;
            };

            $dnis = array_map(fn($agent) => $agent->dni, $multiSchoolAgents);
            $cargosByDni = [];
            if (!empty($dnis)) {
                $placeholders = implode(',', array_fill(0, count($dnis), '?'));
                $allCargos = DB::select("
                    SELECT c.dni, c.cue, c.establecimiento, c.turno, ed.latitud, ed.longitud, ed.calle, ed.numero_puerta, ed.localidad
                    FROM agente_cargos c
                    LEFT JOIN establecimientos e ON c.cue = e.cue
                    LEFT JOIN edificios ed ON e.edificio_id = ed.id
                    WHERE c.dni IN ({$placeholders}) AND c.cue IS NOT NULL AND c.anio = ?
                ", array_merge($dnis, [$year]));
                foreach ($allCargos as $c) {
                    $cargosByDni[$c->dni][] = $c;
                }
            }

            foreach ($multiSchoolAgents as $agent) {
                $dni = $agent->dni;
                $nombre = $agent->nombre_agente;

                // Fetch their schools with lat/lon from database
                $cargos = $cargosByDni[$dni] ?? [];

                $cargosBySchool = [];
                foreach ($cargos as $c) {
                    $cue = $c->cue;
                    if (!isset($cargosBySchool[$cue])) {
                        $direccion = trim(($c->calle ?: '') . ' ' . ($c->numero_puerta ?: '') . ', ' . ($c->localidad ?: ''));
                        $cargosBySchool[$cue] = [
                            'cue' => $cue,
                            'establecimiento' => $c->establecimiento,
                            'lat' => $c->latitud,
                            'lon' => $c->longitud,
                            'direccion' => $direccion,
                            'turnos' => []
                        ];
                    }
                    if ($c->turno && !in_array($c->turno, $cargosBySchool[$cue]['turnos'])) {
                        $cargosBySchool[$cue]['turnos'][] = $c->turno;
                    }
                }

                $schoolKeys = array_keys($cargosBySchool);
                $schoolCount = count($schoolKeys);
                if ($schoolCount < 2) {
                    continue;
                }

                // Compare pairs of schools
                for ($i = 0; $i < $schoolCount; $i++) {
                    for ($j = $i + 1; $j < $schoolCount; $j++) {
                        $s1 = $cargosBySchool[$schoolKeys[$i]];
                        $s2 = $cargosBySchool[$schoolKeys[$j]];

                        $dist = $haversine($s1['lat'], $s1['lon'], $s2['lat'], $s2['lon']);
                        if ($dist === null) {
                            continue;
                        }

                        $t1List = $s1['turnos'];
                        $t2List = $s2['turnos'];

                        $hasConflict = false;
                        $conflictType = "Ninguno";
                        foreach ($t1List as $t1) {
                            foreach ($t2List as $t2) {
                                if ($t1 === $t2) {
                                    $hasConflict = true;
                                    $conflictType = "Mismo Turno (Doble Carga)";
                                } elseif (($t1 === "MAÑANA" && $t2 === "TARDE") || ($t1 === "TARDE" && $t2 === "MAÑANA")) {
                                    $hasConflict = true;
                                    $conflictType = "Turnos Contiguos (M/T)";
                                } elseif (($t1 === "TARDE" && in_array($t2, ["VESPERTINO", "NOCHE"])) || ($t2 === "TARDE" && in_array($t1, ["VESPERTINO", "NOCHE"]))) {
                                    $hasConflict = true;
                                    $conflictType = "Turnos Contiguos (T/V)";
                                }
                            }
                        }

                        $severity = "verde";
                        if ($dist > 15.0) {
                            $severity = "rojo";
                        } elseif ($dist > 5.0) {
                            $severity = "amarillo";
                        }

                        $auditResults[] = [
                            'dni' => $dni,
                            'nombre_agente' => $nombre,
                            'escuela1' => $s1['establecimiento'],
                            'cue1' => $s1['cue'],
                            'lat1' => $s1['lat'],
                            'lon1' => $s1['lon'],
                            'turnos1' => $s1['turnos'],
                            'direccion1' => $s1['direccion'],
                            'escuela2' => $s2['establecimiento'],
                            'cue2' => $s2['cue'],
                            'lat2' => $s2['lat'],
                            'lon2' => $s2['lon'],
                            'turnos2' => $s2['turnos'],
                            'direccion2' => $s2['direccion'],
                            'distancia_km' => round($dist, 2),
                            'conflictivo' => $hasConflict,
                            'tipo_conflicto' => $conflictType,
                            'semaforo' => $severity
                        ];
                    }
                }
            }

            // Sort by distance descending
            usort($auditResults, function ($a, $b) {
                return $b['distancia_km'] <=> $a['distancia_km'];
            });

            $totalAuditados = count($auditResults);
            $rojos = 0;
            $amarillos = 0;
            $verdes = 0;
            foreach ($auditResults as $x) {
                if ($x['semaforo'] === 'rojo') $rojos++;
                elseif ($x['semaforo'] === 'amarillo') $amarillos++;
                else $verdes++;
            }

            $topDisperso = $totalAuditados > 0 ? $auditResults[0] : null;

            // Count the most critical pairs
            $pairCounts = [];
            foreach ($auditResults as $x) {
                $pair = [$x['cue1'], $x['cue2']];
                sort($pair);
                $key = "{$pair[0]}-{$pair[1]}";
                if (!isset($pairCounts[$key])) {
                    $pairCounts[$key] = [
                        'cueA' => $pair[0],
                        'cueB' => $pair[1],
                        'count' => 0
                    ];
                }
                $pairCounts[$key]['count']++;
            }

            // Sort pair counts by count descending
            usort($pairCounts, function ($a, $b) {
                return $b['count'] <=> $a['count'];
            });

            $mostCommonPairs = [];
            $topPairs = array_slice($pairCounts, 0, 3);
            foreach ($topPairs as $p) {
                $cueA = $p['cueA'];
                $cueB = $p['cueB'];

                $nameA = '';
                $nameB = '';

                foreach ($auditResults as $res) {
                    if ($res['cue1'] === $cueA) {
                        $nameA = $res['escuela1'];
                        break;
                    }
                    if ($res['cue2'] === $cueA) {
                        $nameA = $res['escuela2'];
                        break;
                    }
                }

                foreach ($auditResults as $res) {
                    if ($res['cue1'] === $cueB) {
                        $nameB = $res['escuela1'];
                        break;
                    }
                    if ($res['cue2'] === $cueB) {
                        $nameB = $res['escuela2'];
                        break;
                    }
                }

                $mostCommonPairs[] = [
                    'cueA' => $cueA,
                    'nombreA' => $nameA ?: (string)$cueA,
                    'cueB' => $cueB,
                    'nombreB' => $nameB ?: (string)$cueB,
                    'count' => $p['count']
                ];
            }

            return response()->json([
                'data' => array_slice($auditResults, 0, 30),
                'stats' => [
                    'total_auditados' => $totalAuditados,
                    'rojos' => $rojos,
                    'amarillos' => $amarillos,
                    'verdes' => $verdes,
                    'top_disperso' => $topDisperso,
                    'pares_criticos' => $mostCommonPairs
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
