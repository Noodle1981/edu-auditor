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

        $resultados = DB::table('auditoria_radio_resultados as r')
            ->where('r.nomina_id', $nominaSeleccionada->id)
            ->leftJoin('establecimientos as e', 'e.cue', '=', 'r.cue')
            ->leftJoin('modalidades as m', 'm.establecimiento_id', '=', 'e.id')
            ->leftJoin('edificios as ed', 'ed.id', '=', 'e.edificio_id')
            ->select(
                'r.*',
                DB::raw('COALESCE(ed.zona_departamento, "S/D") as departamento'),
                DB::raw('COALESCE(m.ambito, "PUBLICO") as ambito')
            )
            ->groupBy('r.id')
            ->orderBy('r.sector')
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
                DB::raw('COALESCE(m.ambito, "PUBLICO") as ambito'),
                DB::raw('COALESCE(m.radio_sige, m.radio) as radio_sige'),
                DB::raw('COALESCE(m.direccion_area, "S/N") as nivel_educativo')
            )
            ->groupBy('v.id')
            ->orderBy('v.sector', 'asc')
            ->get();

        // Deducir radio sueldo (A04) para cada registro viejo
        $viejos = $viejos->map(function ($v) {
            $p = (float)$v->porcentaje_pagado;
            if ($p <= 45) $r = 1;
            else if ($p <= 55) $r = 2;
            else if ($p <= 85) $r = 3;
            else if ($p <= 105) $r = 4;
            else if ($p <= 125) $r = 5;
            else if ($p <= 145) $r = 6;
            else $r = 7;
            $v->radio_sueldo = $r;
            return $v;
        });

        // Sectores SIGE con conflicto interno (públicos y privados)
        $conflictosSige = DB::table('modalidades as m')
            ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
            ->join('edificios as ed', 'ed.id', '=', 'e.edificio_id')
            ->whereNull('m.deleted_at')
            ->whereNull('e.deleted_at')
            ->select(
                DB::raw('CAST(m.sector AS INTEGER) as sector'),
                DB::raw('GROUP_CONCAT(DISTINCT m.radio) as radios_distintos'),
                DB::raw('GROUP_CONCAT(DISTINCT m.direccion_area) as niveles'),
                DB::raw("GROUP_CONCAT(e.nombre || '||' || e.cue || '||' || ed.cui || '||' || COALESCE(ed.zona_departamento, 'S/D') || '||' || m.radio || '||' || m.ambito, '###') as establecimientos_detallados"),
                DB::raw('COUNT(m.id) as cant_modalidades')
            )
            ->groupBy(DB::raw('CAST(m.sector AS INTEGER)'))
            ->havingRaw('COUNT(DISTINCT m.radio) > 1')
            ->orderBy(DB::raw('CAST(m.sector AS INTEGER)'))
            ->get();

        // Sectores sin SIGE para la pestaña de saneamiento
        $sectoresSinSige = AuditoriaRadioResultado::where('nomina_id', $nominaSeleccionada->id)
            ->whereIn('estado_auditoria', ['SIN_SIGE', 'SIN_SECTOR'])
            ->orderBy('sector')
            ->get();

        $establecimientosList = DB::table('establecimientos as e')
            ->join('edificios as ed', 'ed.id', '=', 'e.edificio_id')
            ->select('e.id', 'e.cue', 'e.nombre', 'ed.zona_departamento as departamento', 'ed.localidad')
            ->orderBy('e.nombre')
            ->get();

        $cruceEscuelas = DB::table('establecimientos as e')
            ->join('edificios as ed', 'ed.id', '=', 'e.edificio_id')
            ->join('modalidades as m', 'm.establecimiento_id', '=', 'e.id')
            ->leftJoin('auditoria_radio_resultados as r', function ($join) use ($nominaSeleccionada) {
                $join->on(DB::raw('CAST(m.sector AS INTEGER)'), '=', 'r.sector')
                     ->where('r.nomina_id', '=', $nominaSeleccionada->id);
            })
            ->whereNull('e.deleted_at')
            ->whereNull('m.deleted_at')
            ->select(
                'e.id as establecimiento_id',
                'e.cue',
                'e.nombre as nombre_establecimiento',
                'ed.zona_departamento as departamento',
                'm.nivel_educativo',
                'm.direccion_area',
                'm.sector as sector_sige',
                'm.radio as radio_sige',
                'm.ambito as ambito',
                'r.radio_sueldo',
                'r.total_filas_docentes',
                'r.estado_auditoria',
                'r.id as auditoria_id'
            )
            ->orderBy('e.nombre')
            ->get();

        // Filter results and old records to those linked to a school/CUE
        $linkedResultados = $resultados->filter(fn($r) => !empty($r->cue));
        $linkedViejos = $viejos->filter(fn($v) => !empty($v->cue) && $v->nombre_establecimiento !== 'Sin Establecimiento Registrado');

        // Métricas KPIs (enfocadas en establecimientos)
        $totalSectores = $linkedResultados->pluck('sector')->filter()->unique()->count();
        $totalFilasDocentes = $linkedResultados->sum('total_filas_docentes');

        $coincidenTotal = $linkedResultados->where('estado_auditoria', 'COINCIDE_TOTAL')->sum('total_filas_docentes');
        $coincidenSige = $linkedResultados->whereIn('estado_auditoria', ['COINCIDE_TOTAL', 'COINCIDE_SIGE', 'COINCIDE_SIGE_Y_CAMINO', 'COINCIDE_SIGE_Y_CIRC'])->sum('total_filas_docentes');
        
        $pagaMasCount = $linkedResultados->where('estado_auditoria', 'PAGA_MAS_QUE_SIGE')->count();
        $pagaMasDocentes = $linkedResultados->where('estado_auditoria', 'PAGA_MAS_QUE_SIGE')->sum('total_filas_docentes');

        $pagaMenosCount = $linkedResultados->where('estado_auditoria', 'PAGA_MENOS_QUE_SIGE')->count();
        $pagaMenosDocentes = $linkedResultados->where('estado_auditoria', 'PAGA_MENOS_QUE_SIGE')->sum('total_filas_docentes');

        $sinSigeCount = $linkedResultados->where('estado_auditoria', 'SIN_SIGE')->count();
        $sinSigeDocentes = $linkedResultados->where('estado_auditoria', 'SIN_SIGE')->sum('total_filas_docentes');

        $zonasInconsistentesCount = $linkedResultados->where('coincide_zona', false)->whereNotNull('zona_sige')->pluck('sector')->filter()->unique()->count();

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
            'registros_escala_vieja' => $linkedViejos->count(),
        ];

        return Inertia::render('AuditoriaSueldos/Index', [
            'nominas' => $nominas,
            'nominaSeleccionada' => $nominaSeleccionada,
            'resultados' => $resultados,
            'viejos' => $viejos,
            'conflictosSige' => $conflictosSige,
            'sectoresSinSige' => $sectoresSinSige,
            'establecimientosList' => $establecimientosList,
            'cruceEscuelas' => $cruceEscuelas,
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

    /**
     * Link/sanear an unmapped sector to an establishment.
     */
    public function sanearSector(Request $request)
    {
        $request->validate([
            'sector' => 'required',
            'establecimiento_id' => 'required|exists:establecimientos,id',
            'observacion' => 'nullable|string',
        ]);

        $sector = (int)$request->input('sector');
        $estId = $request->input('establecimiento_id');
        $obs = $request->input('observacion', 'Saneamiento manual de sector');

        $est = DB::table('establecimientos')->where('id', $estId)->first();

        // 1. Vincular en modalidades
        DB::table('modalidades')
            ->where('establecimiento_id', $estId)
            ->update(['sector' => (string)$sector, 'observaciones' => $obs]);

        // 2. Actualizar en auditoria_radio_resultados
        DB::table('auditoria_radio_resultados')
            ->where('sector', $sector)
            ->update([
                'nombre_establecimiento' => $est->nombre,
                'cue' => $est->cue,
                'estado_gestion' => 'CORREGIDO',
                'notas_auditor' => 'Saneado y vinculado a CUE ' . $est->cue . ': ' . $obs
            ]);

        return response()->json([
            'message' => 'Sector ' . $sector . ' saneado y vinculado con éxito a ' . $est->nombre,
        ]);
    }
}
