<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function advanced()
    {
        try {
            // 1. Escuelas con mayores licencias
            $escuelasLicencias = DB::select("
                SELECT c.cue, c.establecimiento, COUNT(l.id) as count, COUNT(DISTINCT l.dni) as docentes,
                       ed.cui, ed.localidad, ed.letra_zona as zona, ed.zona_departamento as departamento,
                       GROUP_CONCAT(DISTINCT m.nivel_educativo) as nivel_educativo
                FROM licencias l
                JOIN agente_cargos c ON l.dni = c.dni
                LEFT JOIN establecimientos e ON c.cue = e.cue
                LEFT JOIN edificios ed ON e.edificio_id = ed.id
                LEFT JOIN modalidades m ON m.establecimiento_id = e.id
                WHERE c.cue IS NOT NULL AND c.establecimiento != ''
                GROUP BY c.cue, c.establecimiento
                ORDER BY count DESC
                LIMIT 30
            ");

            // 2. Licencias incongruentes
            $licenciasIncongruentes = DB::select("
                SELECT id_tramite, nombre_agente, dni, tipo_licencia, fecha_inicio, fecha_fin, dias
                FROM licencias
                WHERE dias > 365 OR fecha_inicio LIKE '%2060%' OR fecha_fin LIKE '%2060%' OR fecha_inicio LIKE '%2099%' OR fecha_fin LIKE '%2099%'
                ORDER BY dias DESC
                LIMIT 10
            ");

            // 3. Solapamientos
            $solapamientos = DB::select("
                SELECT l1.dni, l1.nombre_agente, l1.tipo_licencia as lic1, l1.fecha_inicio as ini1, l1.fecha_fin as fin1,
                       l2.tipo_licencia as lic2, l2.fecha_inicio as ini2, l2.fecha_fin as fin2
                FROM licencias l1
                JOIN licencias l2 ON l1.dni = l2.dni AND l1.id < l2.id
                WHERE (l1.fecha_inicio <= l2.fecha_fin AND l1.fecha_fin >= l2.fecha_inicio)
                LIMIT 10
            ");

            // 4. Licencias sin suplente
            $noSuplenteAlerts = DB::select("
                SELECT 
                    l.dni, 
                    l.nombre_agente, 
                    l.tipo_licencia, 
                    l.fecha_inicio, 
                    l.fecha_fin,
                    c.cue,
                    c.establecimiento,
                    c.turno
                FROM (
                    SELECT DISTINCT dni, nombre_agente, tipo_licencia, fecha_inicio, fecha_fin, id 
                    FROM licencias 
                    ORDER BY id DESC 
                    LIMIT 100
                ) l
                JOIN agente_cargos c ON l.dni = c.dni
                LEFT JOIN designaciones d ON d.cue = c.cue 
                                          AND d.turno = c.turno 
                                          AND d.situacion_revista IN ('SUPLENTE', 'REEMPLAZANTE')
                WHERE c.cue IS NOT NULL 
                  AND c.turno IS NOT NULL 
                  AND d.id IS NULL
                LIMIT 10
            ");

            // 5. All schools by designaciones with geography and levels
            $escuelasDesignaciones = DB::select("
                SELECT d.cue, d.establecimiento, COUNT(d.id) as count, COUNT(DISTINCT d.dni) as docentes_unicos,
                       ed.zona_departamento as departamento,
                       GROUP_CONCAT(DISTINCT m.nivel_educativo) as nivel_educativo
                FROM designaciones d
                LEFT JOIN establecimientos e ON d.cue = e.cue
                LEFT JOIN edificios ed ON e.edificio_id = ed.id
                LEFT JOIN modalidades m ON m.establecimiento_id = e.id
                WHERE d.cue IS NOT NULL AND d.establecimiento != ''
                GROUP BY d.cue, d.establecimiento
                ORDER BY count DESC
            ");

            return response()->json([
                'escuelas_licencias' => $escuelasLicencias,
                'licencias_incongruentes' => $licenciasIncongruentes,
                'solapamientos' => $solapamientos,
                'sin_suplente' => $noSuplenteAlerts,
                'escuelas_designaciones' => $escuelasDesignaciones
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
