<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard');
    }

    public function stats(Request $request)
    {
        try {
            $year = (int)$request->query('year');
            if (!$year) {
                $latestYearRow = DB::selectOne("SELECT MAX(anio) as max_year FROM agente_cargos");
                $year = $latestYearRow && $latestYearRow->max_year ? (int)$latestYearRow->max_year : 2026;
            }

            $stats = \Illuminate\Support\Facades\Cache::remember('dashboard_stats_' . $year, 86400, function () use ($year) {
                $stats = [];

                // 1. Agentes Stats
                $agentesRow = DB::selectOne("
                    SELECT 
                        (SELECT COUNT(DISTINCT dni) FROM agente_cargos WHERE anio = :year1) as total_agentes, 
                        (SELECT COUNT(*) FROM agente_cargos WHERE anio = :year2) as total_roles
                ", ['year1' => $year, 'year2' => $year]);
                $stats['total_agentes'] = $agentesRow ? (int)$agentesRow->total_agentes : 0;
                $stats['total_roles'] = $agentesRow ? (int)$agentesRow->total_roles : 0;

                $generoRows = DB::select("
                    SELECT a.genero, COUNT(*) as count 
                    FROM agente_cargos c 
                    JOIN agentes a ON c.dni = a.dni 
                    WHERE c.anio = ?
                    GROUP BY a.genero
                ", [$year]);
                $stats['genero'] = [];
                foreach ($generoRows as $r) {
                    $g = $r->genero ?: 'DESCONOCIDO';
                    $stats['genero'][$g] = (int)$r->count;
                }

                $revistaRows = DB::select("SELECT situacion_revista, COUNT(*) as count FROM agente_cargos WHERE anio = ? GROUP BY situacion_revista", [$year]);
                $stats['situacion_revista'] = [];
                foreach ($revistaRows as $r) {
                    $sr = $r->situacion_revista ?: 'SIN ESPECIFICAR';
                    $stats['situacion_revista'][$sr] = (int)$r->count;
                }

                $escalafonRows = DB::select("SELECT escalafon, COUNT(*) as count FROM agente_cargos WHERE anio = ? GROUP BY escalafon ORDER BY count DESC LIMIT 8", [$year]);
                $stats['escalafon'] = [];
                foreach ($escalafonRows as $r) {
                    $stats['escalafon'][$r->escalafon] = (int)$r->count;
                }

                $topEstRows = DB::select("
                    SELECT cue, establecimiento, COUNT(*) as count, COUNT(DISTINCT dni) as agentes_unicos 
                    FROM agente_cargos 
                    WHERE cue IS NOT NULL AND establecimiento != '' AND anio = ?
                    GROUP BY cue, establecimiento 
                    ORDER BY count DESC 
                    LIMIT 10
                ", [$year]);
                $stats['top_establecimientos'] = [];
                foreach ($topEstRows as $r) {
                    $stats['top_establecimientos'][] = [
                        'cue' => $r->cue,
                        'establecimiento' => $r->establecimiento,
                        'roles_count' => (int)$r->count,
                        'agentes_unicos' => (int)$r->agentes_unicos
                    ];
                }

                // Latest Alta extraction
                $datesRows = DB::select("
                    SELECT DISTINCT a.fecha_alta 
                    FROM agentes a
                    JOIN agente_cargos c ON a.dni = c.dni
                    WHERE c.anio = ? AND a.fecha_alta != ''
                ", [$year]);
                $latestAlta = "N/A";
                $parsedDates = [];
                foreach ($datesRows as $row) {
                    $d = $row->fecha_alta;
                    try {
                        if (str_contains($d, '/')) {
                            $parts = explode('/', $d);
                            if (count($parts) === 3) {
                                $day = (int)$parts[0];
                                $month = (int)$parts[1];
                                $yearVal = (int)$parts[2];
                                if ($yearVal < 100) $yearVal += 2000;
                                $parsedDates[] = Carbon::create($yearVal, $month, $day);
                            }
                        } elseif (str_contains($d, '-')) {
                            $parts = explode('-', $d);
                            if (count($parts) === 3) {
                                $yearVal = (int)$parts[0];
                                $month = (int)$parts[1];
                                $day = (int)$parts[2];
                                if ($yearVal < 100) $yearVal += 2000;
                                $parsedDates[] = Carbon::create($yearVal, $month, $day);
                            }
                        }
                    } catch (\Exception $e) {
                        // skip
                    }
                }
                if (!empty($parsedDates)) {
                    $latestAlta = max($parsedDates)->format('d/m/Y');
                }
                $stats['registro_mas_reciente'] = $latestAlta;

                // 2. Designaciones Stats
                $desigRow = DB::selectOne("SELECT COUNT(*) as total FROM designaciones WHERE anio = ?", [$year]);
                $stats['total_designaciones'] = $desigRow ? (int)$desigRow->total : 0;

                // 3. Licencias Stats
                $licRow = DB::selectOne("SELECT COUNT(*) as total FROM licencias WHERE anio = ?", [$year]);
                $stats['total_licencias'] = $licRow ? (int)$licRow->total : 0;

                $topLicRows = DB::select("SELECT tipo_licencia, COUNT(*) as count FROM licencias WHERE anio = ? GROUP BY tipo_licencia ORDER BY count DESC LIMIT 5", [$year]);
                $stats['top_licencias'] = [];
                foreach ($topLicRows as $r) {
                    $stats['top_licencias'][$r->tipo_licencia] = (int)$r->count;
                }

                // 4. Establecimientos Stats
                $estRow = DB::selectOne("SELECT COUNT(*) as total FROM establecimientos");
                $stats['total_escuelas_fisicas'] = $estRow ? (int)$estRow->total : 0;

                $topNivRows = DB::select("SELECT nivel_educativo, COUNT(*) as count FROM modalidades WHERE nivel_educativo IS NOT NULL GROUP BY nivel_educativo ORDER BY count DESC LIMIT 5");
                $stats['top_niveles'] = [];
                foreach ($topNivRows as $r) {
                    $stats['top_niveles'][$r->nivel_educativo] = (int)$r->count;
                }

                // 5. Demographics
                // A. Departamentos / Agentes
                $stats['departamentos_agentes'] = DB::select("
                    SELECT ed.zona_departamento as departamento, COUNT(DISTINCT c.dni) as count
                    FROM agente_cargos c
                    JOIN establecimientos e ON c.cue = e.cue
                    JOIN edificios ed ON e.edificio_id = ed.id
                    WHERE c.anio = ? AND ed.zona_departamento IS NOT NULL AND ed.zona_departamento != ''
                    GROUP BY ed.zona_departamento
                    ORDER BY count DESC
                ", [$year]);

                // B. Departamentos / Género
                $stats['departamentos_genero'] = DB::select("
                    SELECT ed.zona_departamento as departamento, a.genero, COUNT(DISTINCT c.dni) as count
                    FROM agente_cargos c
                    JOIN agentes a ON c.dni = a.dni
                    JOIN establecimientos e ON c.cue = e.cue
                    JOIN edificios ed ON e.edificio_id = ed.id
                    WHERE c.anio = ? AND ed.zona_departamento IS NOT NULL AND ed.zona_departamento != '' AND a.genero IS NOT NULL AND a.genero != ''
                    GROUP BY ed.zona_departamento, a.genero
                ", [$year]);

                // C. Departamentos / Licencias
                $stats['departamentos_licencias'] = DB::select("
                    SELECT ed.zona_departamento as departamento, COUNT(l.id) as count
                    FROM licencias l
                    JOIN agente_cargos c ON l.dni = c.dni AND l.anio = c.anio
                    JOIN establecimientos e ON c.cue = e.cue
                    JOIN edificios ed ON e.edificio_id = ed.id
                    WHERE c.anio = ? AND ed.zona_departamento IS NOT NULL AND ed.zona_departamento != ''
                    GROUP BY ed.zona_departamento
                    ORDER BY count DESC
                ", [$year]);

                // D. Departamentos / Traslados
                $stats['departamentos_traslados'] = DB::select("
                    SELECT ed.zona_departamento as departamento, COUNT(DISTINCT c.dni) as count
                    FROM agente_cargos c
                    JOIN establecimientos e ON c.cue = e.cue
                    JOIN edificios ed ON e.edificio_id = ed.id
                    WHERE c.anio = ? AND c.dni IN (
                        SELECT dni FROM agente_cargos WHERE anio = ? AND cue IS NOT NULL GROUP BY dni HAVING COUNT(DISTINCT cue) > 1
                    ) AND ed.zona_departamento IS NOT NULL AND ed.zona_departamento != ''
                    GROUP BY ed.zona_departamento
                    ORDER BY count DESC
                ", [$year, $year]);

                // E. Niveles / Género
                $stats['niveles_genero'] = DB::select("
                    SELECT m.nivel_educativo, a.genero, COUNT(DISTINCT c.dni) as count
                    FROM agente_cargos c
                    JOIN agentes a ON c.dni = a.dni
                    JOIN establecimientos e ON c.cue = e.cue
                    JOIN modalidades m ON m.establecimiento_id = e.id
                    WHERE c.anio = ? AND m.nivel_educativo IS NOT NULL AND m.nivel_educativo != '' AND a.genero IS NOT NULL AND a.genero != ''
                    GROUP BY m.nivel_educativo, a.genero
                ", [$year]);

                // F. Niveles / Traslados
                $stats['niveles_traslados'] = DB::select("
                    SELECT m.nivel_educativo, COUNT(DISTINCT c.dni) as count
                    FROM agente_cargos c
                    JOIN establecimientos e ON c.cue = e.cue
                    JOIN modalidades m ON m.establecimiento_id = e.id
                    WHERE c.anio = ? AND c.dni IN (
                        SELECT dni FROM agente_cargos WHERE anio = ? AND cue IS NOT NULL GROUP BY dni HAVING COUNT(DISTINCT cue) > 1
                    ) AND m.nivel_educativo IS NOT NULL AND m.nivel_educativo != ''
                    GROUP BY m.nivel_educativo
                    ORDER BY count DESC
                ", [$year, $year]);

                // DB updated date
                $dbPath = database_path('database.sqlite');
                $dbDate = "N/A";
                if (file_exists($dbPath)) {
                    $dbDate = Carbon::createFromTimestamp(filemtime($dbPath))->format('d/m/Y H:i');
                }
                $stats['db_actualizado'] = $dbDate;

                return $stats;
            });

            return response()->json($stats);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
