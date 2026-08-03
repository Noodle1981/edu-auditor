<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditoriaRadioResultado;
use App\Models\AuditoriaSueldoRegistroViejo;
use App\Models\NominaSueldo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AuditoriaSueldosController extends Controller
{
    /**
     * Display the main salary & radio audit dashboard.
     */
    public function index(Request $request)
    {
        $nominas = NominaSueldo::orderBy('periodo', 'desc')->get();
        $nominaSeleccionada = $request->input('periodo')
            ? NominaSueldo::where('periodo', $request->input('periodo'))->first()
            : $nominas->first();

        if (!$nominaSeleccionada) {
            return Inertia::render('AuditoriaSueldos/Index', [
                'nominas' => [],
                'nominaSeleccionada' => null,
                'resultados' => [],
                'viejos' => [],
                'conflictosSige' => [],
                'kpis' => [],
            ]);
        }

        $resultados = AuditoriaRadioResultado::where('nomina_id', $nominaSeleccionada->id)
            ->orderBy('sector')
            ->get();

        $viejos = DB::table('auditoria_sueldo_registros_viejos as v')
            ->where('v.nomina_id', $nominaSeleccionada->id)
            ->leftJoin('modalidades as m', function ($join) {
                $join->on(DB::raw('CAST(m.sector AS INTEGER)'), '=', 'v.sector');
            })
            ->leftJoin('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
            ->leftJoin('edificios as ed', 'ed.id', '=', 'e.edificio_id')
            ->select(
                'v.*',
                DB::raw('COALESCE(e.nombre, "Sin Establecimiento Registrado") as nombre_establecimiento'),
                DB::raw('e.cue as cue'),
                DB::raw('COALESCE(ed.zona_departamento, "S/D") as departamento'),
                DB::raw('COALESCE(m.radio_sige, m.radio) as radio_sige')
            )
            ->groupBy('v.id')
            ->orderBy('v.sector', 'asc')
            ->get();

        // 27 sectores SIGE con conflicto interno (distintos radios en modalidades del mismo sector)
        $conflictosSige = DB::table('modalidades as m')
            ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
            ->join('edificios as ed', 'ed.id', '=', 'e.edificio_id')
            ->where('m.ambito', 'PUBLICO')
            ->whereNull('m.deleted_at')
            ->whereNull('e.deleted_at')
            ->select(
                DB::raw('CAST(m.sector AS INTEGER) as sector'),
                DB::raw('GROUP_CONCAT(DISTINCT m.radio) as radios_distintos'),
                DB::raw('GROUP_CONCAT(DISTINCT m.direccion_area) as niveles'),
                DB::raw('GROUP_CONCAT(DISTINCT e.nombre) as establecimientos'),
                DB::raw('COUNT(m.id) as cant_modalidades')
            )
            ->groupBy(DB::raw('CAST(m.sector AS INTEGER)'))
            ->havingRaw('COUNT(DISTINCT m.radio) > 1')
            ->orderBy(DB::raw('CAST(m.sector AS INTEGER)'))
            ->get();

        // Métricas KPIs
        $totalSectores = $resultados->pluck('sector')->filter()->unique()->count();
        $totalFilasDocentes = $resultados->sum('total_filas_docentes');

        $coincidenTotal = $resultados->where('estado_auditoria', 'COINCIDE_TOTAL')->sum('total_filas_docentes');
        $coincidenSige = $resultados->whereIn('estado_auditoria', ['COINCIDE_TOTAL', 'COINCIDE_SIGE', 'COINCIDE_SIGE_Y_CAMINO', 'COINCIDE_SIGE_Y_CIRC'])->sum('total_filas_docentes');
        
        $pagaMasCount = $resultados->where('estado_auditoria', 'PAGA_MAS_QUE_SIGE')->count();
        $pagaMasDocentes = $resultados->where('estado_auditoria', 'PAGA_MAS_QUE_SIGE')->sum('total_filas_docentes');

        $pagaMenosCount = $resultados->where('estado_auditoria', 'PAGA_MENOS_QUE_SIGE')->count();
        $pagaMenosDocentes = $resultados->where('estado_auditoria', 'PAGA_MENOS_QUE_SIGE')->sum('total_filas_docentes');

        $sinSigeCount = $resultados->where('estado_auditoria', 'SIN_SIGE')->count();
        $sinSigeDocentes = $resultados->where('estado_auditoria', 'SIN_SIGE')->sum('total_filas_docentes');

        $zonasInconsistentesCount = $resultados->where('coincide_zona', false)->whereNotNull('zona_sige')->pluck('sector')->filter()->unique()->count();

        $kpis = [
            'total_sectores' => $totalSectores,
            'total_filas_docentes' => $totalFilasDocentes,
            'porcentaje_coincidencia' => $totalFilasDocentes > 0 ? round(($coincidenSige / $totalFilasDocentes) * 100, 1) : 0,
            'paga_mas_sectores' => $pagaMasCount,
            'paga_mas_docentes' => $pagaMasDocentes,
            'paga_menos_sectores' => $pagaMenosCount,
            'paga_menos_docentes' => $pagaMenosDocentes,
            'sin_sige_sectores' => $sinSigeCount,
            'sin_sige_docentes' => $sinSigeDocentes,
            'conflictos_sige_sectores' => $conflictosSige->count(),
            'zonas_inconsistentes_sectores' => $zonasInconsistentesCount,
            'registros_escala_vieja' => $viejos->count(),
        ];

        return Inertia::render('AuditoriaSueldos/Index', [
            'nominas' => $nominas,
            'nominaSeleccionada' => $nominaSeleccionada,
            'resultados' => $resultados,
            'viejos' => $viejos,
            'conflictosSige' => $conflictosSige,
            'kpis' => $kpis,
        ]);
    }

    /**
     * Update the management lifecycle state of an audit result item.
     */
    public function updateEstadoGestion(Request $request, $id)
    {
        $request->validate([
            'estado_gestion' => 'required|string|in:PENDIENTE,EN_INVESTIGACION,JUSTIFICADO,CORREGIDO',
            'notas_auditor' => 'nullable|string',
        ]);

        $item = AuditoriaRadioResultado::findOrFail($id);
        $item->update([
            'estado_gestion' => $request->input('estado_gestion'),
            'notas_auditor' => $request->input('notas_auditor', $item->notas_auditor),
        ]);

        return response()->json([
            'message' => 'Estado de gestión actualizado correctamente',
            'item' => $item,
        ]);
    }

    /**
     * Update classification for old scale record.
     */
    public function updateClasificacionViejo(Request $request, $id)
    {
        $request->validate([
            'clasificacion_auditor' => 'required|string|in:PENDIENTE,JUSTIFICADO_LEGAL,ERROR_LIQUIDACION,CASO_ESPECIAL',
            'resolucion_aval' => 'nullable|string',
            'notas_auditor' => 'nullable|string',
        ]);

        $item = AuditoriaSueldoRegistroViejo::findOrFail($id);
        $item->update([
            'clasificacion_auditor' => $request->input('clasificacion_auditor'),
            'resolucion_aval' => $request->input('resolucion_aval', $item->resolucion_aval),
            'notas_auditor' => $request->input('notas_auditor', $item->notas_auditor),
        ]);

        return response()->json([
            'message' => 'Clasificación y norma legal actualizadas correctamente',
            'item' => $item,
        ]);
    }
}
