<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditoriaRadioResultado;
use App\Models\AuditoriaSueldoRegistroViejo;
use App\Models\NominaSueldo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

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

        if (! $nominaSeleccionada) {
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
                DB::raw('COALESCE(m.nivel_educativo, r.nivel_educativo) as nivel_educativo'),
                DB::raw('COALESCE(e.nombre, r.nombre_establecimiento) as nombre_establecimiento'),
                DB::raw('COALESCE(ed.zona_departamento, "S/D") as departamento'),
                DB::raw('COALESCE(m.ambito, "PUBLICO") as ambito'),
                'ed.distancia_camino as dist_camino',
                'ed.dist_circunf'
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
                DB::raw('COALESCE(m.nivel_educativo, "S/N") as nivel_educativo')
            )
            ->groupBy('v.id')
            ->orderBy('v.sector', 'asc')
            ->get();

        // Deducir radio sueldo (A04) para cada registro viejo
        $viejos = $viejos->map(function ($v) {
            $p = (float) $v->porcentaje_pagado;
            if ($p <= 45) {
                $r = 1;
            } elseif ($p <= 55) {
                $r = 2;
            } elseif ($p <= 85) {
                $r = 3;
            } elseif ($p <= 105) {
                $r = 4;
            } elseif ($p <= 125) {
                $r = 5;
            } elseif ($p <= 145) {
                $r = 6;
            } else {
                $r = 7;
            }
            $v->radio_sueldo = $r;

            return $v;
        });

        // Sectores SIGE con conflicto interno (públicos y privados)
        $conflictosSige = DB::table('modalidades as m')
            ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
            ->join('edificios as ed', 'ed.id', '=', 'e.edificio_id')
            ->leftJoin('auditoria_radio_resultados as r', function ($join) use ($nominaSeleccionada) {
                $join->on(DB::raw('CAST(m.sector AS INTEGER)'), '=', 'r.sector')
                    ->where('r.nomina_id', '=', $nominaSeleccionada->id);
            })
            ->whereNull('m.deleted_at')
            ->whereNull('e.deleted_at')
            ->where(function ($q) {
                $q->whereNull('m.direccion_area')
                  ->orWhere('m.direccion_area', '!=', 'ADMINISTRACIÓN');
            })
            ->select(
                DB::raw('CAST(m.sector AS INTEGER) as sector'),
                DB::raw('GROUP_CONCAT(DISTINCT m.radio) as radios_distintos'),
                DB::raw('GROUP_CONCAT(DISTINCT m.direccion_area) as niveles'),
                DB::raw("GROUP_CONCAT(e.nombre || '||' || e.cue || '||' || ed.cui || '||' || COALESCE(ed.zona_departamento, 'S/D') || '||' || m.radio || '||' || m.ambito || '||' || COALESCE(r.centro, '') || '||' || COALESCE(r.sector, '') || '||' || COALESCE(r.radio_sueldo, ''), '###') as establecimientos_detallados"),
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
            ->leftJoin('modalidades as m', 'm.establecimiento_id', '=', 'e.id')
            ->select(
                'e.id',
                'e.cue',
                'e.nombre',
                'ed.zona_departamento as departamento',
                'ed.localidad',
                DB::raw('MAX(m.radio) as radio')
            )
            ->groupBy('e.id')
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
            ->where(function ($q) {
                $q->whereNull('m.direccion_area')
                  ->orWhere('m.direccion_area', '!=', 'ADMINISTRACIÓN');
            })
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
                'r.centro as centro',
                'r.sector as sector_sueldos',
                'r.radio_sueldo',
                'r.radio_circ',
                'r.radio_camino',
                'r.porc_pagado_mediana',
                'r.escala_usada',
                'r.total_filas_docentes',
                'r.estado_auditoria',
                'r.id as auditoria_id',
                'ed.distancia_camino as dist_camino',
                'ed.dist_circunf'
            )
            ->orderBy('e.nombre')
            ->get();

        // Filter results and old records to those linked to a school/CUE
        $linkedResultados = $resultados->filter(fn ($r) => ! empty($r->cue));
        $linkedViejos = $viejos->filter(fn ($v) => ! empty($v->cue) && $v->nombre_establecimiento !== 'Sin Establecimiento Registrado');

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

        $totalCentros = $resultados->pluck('centro')->filter()->unique()->count();

        $nombresCentros = [
            98 => 'Docentes Titulares e Interinos en Cargos',
            19 => 'Docentes Suplentes en Cargos (Reemplazantes)',
            80 => 'Personal Transferido (Cargos y HC Nivel Medio)',
            85 => 'Docentes Titulares e Interinos de Nivel Superior',
            63 => 'Agentes de Enseñanza Privada (Nivel Medio / Superior)',
            64 => 'Agentes de Enseñanza Privada (Nivel Primario / Inicial)',
            69 => 'Personal Administrativo y de Servicios',
            53 => 'Personal Político / Subsecretaría / Planeamiento',
            20 => 'Suplentes Cargos y HC Nivel Medio',
            24 => 'Suplentes Nivel Medio / EGB III',
            29 => 'Enseñanza Privada - Suplentes en Cargos',
            51 => 'Interinos',
            57 => 'Docentes Suplentes',
            65 => 'Agentes de Enseñanza Privada',
            67 => 'Agentes de Enseñanza Privada (Cargos y HC)',
            75 => 'Suplentes Cargos y HC Nivel Medio',
            76 => 'Interinos y Titulares Nivel Medio / EGB III',
            77 => 'Interinos y Titulares en Cargos',
            79 => 'Suplentes Cargos y HC Nivel Medio',
            81 => 'Interinos y Titulares en Cargos',
            82 => 'Suplentes Cargos y HC Nivel Medio',
            86 => 'Suplentes Cargos y HC Nivel Medio',
            88 => 'Suplentes Cargos y HC Nivel Medio',
            94 => 'Interinos y Titulares HC Nivel Medio',
        ];

        $centrosBreakdown = $resultados->groupBy('centro')->map(function ($group, $centroKey) use ($nombresCentros) {
            $totalSectores = $group->count();
            $personal = $group->sum('total_filas_docentes');
            $coinciden = $group->whereIn('estado_auditoria', ['COINCIDE_TOTAL', 'COINCIDE_SIGE', 'COINCIDE_SIGE_Y_CAMINO', 'COINCIDE_SIGE_Y_CIRC'])->count();
            $pagaMas = $group->where('estado_auditoria', 'PAGA_MAS_QUE_SIGE')->count();
            $pagaMenos = $group->where('estado_auditoria', 'PAGA_MENOS_QUE_SIGE')->count();
            $sinSige = $group->where('estado_auditoria', 'SIN_SIGE')->count();

            $nombre = isset($nombresCentros[(int) $centroKey])
                ? $nombresCentros[(int) $centroKey]
                : 'Repartición Salarial / Liquidaciones';

            return [
                'centro' => $centroKey ?: 'S/D',
                'nombre_centro' => $nombre,
                'sectores' => $totalSectores,
                'personal' => $personal,
                'coinciden' => $coinciden,
                'paga_mas' => $pagaMas,
                'paga_menos' => $pagaMenos,
                'sin_sige' => $sinSige,
                'tasa_coincidencia' => $totalSectores > 0 ? round(($coinciden / $totalSectores) * 100, 1) : 0,
            ];
        })->values()->sortByDesc('personal')->values();

        $kpis = [
            'total_centros' => $totalCentros,
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
            'centrosBreakdown' => $centrosBreakdown,
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
            'id' => 'nullable|integer',
            'sector' => 'required',
            'centro' => 'nullable',
            'establecimiento_id' => 'nullable|exists:establecimientos,id',
            'observacion' => 'nullable|string',
            'estado_gestion' => 'nullable|string',
        ]);

        $recordId = $request->input('id');
        $sector = (int) $request->input('sector');
        $centro = $request->input('centro');
        $estId = $request->input('establecimiento_id');
        $obs = $request->input('observacion', 'Investigación y saneamiento manual de sector');
        $estadoGestion = $request->input('estado_gestion', 'EN_INVESTIGACION');

        $est = $estId ? DB::table('establecimientos')->where('id', $estId)->first() : null;
        $estRadio = $estId ? DB::table('modalidades')->where('establecimiento_id', $estId)->value('radio') : null;

        $query = DB::table('auditoria_radio_resultados');
        if ($recordId) {
            $query->where('id', $recordId);
        } else {
            $query->where('sector', $sector);
            if ($centro !== null) {
                $query->where('centro', $centro);
            }
        }

        $auditRecord = (clone $query)->first();

        $estadoAuditoria = 'COINCIDE_SIGE';
        if ($estadoGestion === 'DADO_DE_BAJA') {
            $estadoAuditoria = 'DADO_DE_BAJA';
        } elseif ($auditRecord && $auditRecord->radio_sueldo !== null && $estRadio !== null) {
            $radioSueldo = (float) $auditRecord->radio_sueldo;
            $radioSige = (float) $estRadio;
            if ($radioSueldo > $radioSige) {
                $estadoAuditoria = 'PAGA_MÁS_QUE_SIGE';
            } elseif ($radioSueldo < $radioSige) {
                $estadoAuditoria = 'PAGA_MENOS_QUE_SIGE';
            } else {
                $estadoAuditoria = 'COINCIDE_SIGE';
            }
        }

        // Registrar vínculo ÚNICAMENTE en el historial de auditoría (preservando padrón oficial SIGE)
        $updateData = [
            'estado_gestion' => $estadoGestion,
        ];

        if ($est) {
            $updateData['nombre_establecimiento'] = $est->nombre;
            $updateData['cue'] = $est->cue;
            $updateData['radio_sige'] = $estRadio;
            $updateData['estado_auditoria'] = $estadoAuditoria;
            $updateData['notas_auditor'] = 'Asociado en auditoría a CUE '.$est->cue.': '.$obs;
        } else {
            $updateData['estado_auditoria'] = $estadoAuditoria;
            $updateData['notas_auditor'] = 'Dado de baja / Cerrado: '.$obs;
        }

        $query->update($updateData);

        return response()->json([
            'message' => 'Sector '.$sector.' actualizado en auditoría como '.$estadoGestion,
            'estado_auditoria' => $estadoAuditoria,
            'estado_gestion' => $estadoGestion,
        ]);
    }

    /**
     * Export audit data to Excel (.xlsx) per active tab for authorities.
     */
    public function exportExcel(Request $request)
    {
        $tab = $request->input('tab', 'kpi');
        $periodo = $request->input('periodo');

        $nominaSeleccionada = $periodo
            ? NominaSueldo::where('periodo', $periodo)->first()
            : NominaSueldo::orderBy('periodo', 'desc')->first();

        if (! $nominaSeleccionada) {
            return response()->json(['error' => 'No hay nómina cargada'], 404);
        }

        $nominaId = $nominaSeleccionada->id;

        $nombresCentros = [
            98 => 'Docentes Titulares e Interinos en Cargos',
            19 => 'Docentes Suplentes en Cargos (Reemplazantes)',
            80 => 'Personal Transferido (Cargos y HC Nivel Medio)',
            85 => 'Docentes Titulares e Interinos de Nivel Superior',
            63 => 'Agentes de Enseñanza Privada (Nivel Medio / Superior)',
            64 => 'Agentes de Enseñanza Privada (Nivel Primario / Inicial)',
            69 => 'Personal Administrativo y de Servicios',
            53 => 'Personal Político / Subsecretaría / Planeamiento',
            20 => 'Suplentes Cargos y HC Nivel Medio',
            24 => 'Suplentes Nivel Medio / EGB III',
            29 => 'Enseñanza Privada - Suplentes en Cargos',
            51 => 'Interinos',
            57 => 'Docentes Suplentes',
            65 => 'Agentes de Enseñanza Privada',
            67 => 'Agentes de Enseñanza Privada (Cargos y HC)',
            75 => 'Suplentes Cargos y HC Nivel Medio',
            76 => 'Interinos y Titulares Nivel Medio / EGB III',
            77 => 'Interinos y Titulares en Cargos',
            79 => 'Suplentes Cargos y HC Nivel Medio',
            81 => 'Interinos y Titulares en Cargos',
            82 => 'Suplentes Cargos y HC Nivel Medio',
            86 => 'Suplentes Cargos y HC Nivel Medio',
            88 => 'Suplentes Cargos y HC Nivel Medio',
            94 => 'Interinos y Titulares HC Nivel Medio',
        ];

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Determine column count and last column letter dynamically
        $lastColLetter = 'K';
        if ($tab === 'kpi') {
            $lastColLetter = 'I';
        } elseif ($tab === 'escala') {
            $lastColLetter = 'I';
        } elseif ($tab === 'cruce') {
            $lastColLetter = 'Q';
        } elseif ($tab === 'conflictos') {
            $lastColLetter = 'L';
        } elseif ($tab === 'paga_mas' || $tab === 'paga_menos' || $tab === 'tracking' || $tab === 'gestion') {
            $lastColLetter = 'O';
        } elseif ($tab === 'zonas') {
            $lastColLetter = 'M';
        } elseif ($tab === 'sin_escuela') {
            $lastColLetter = 'G';
        }

        // Banner superior oficial para autoridades
        $sheet->mergeCells("A1:{$lastColLetter}1");
        $sheet->setCellValue('A1', 'MINISTERIO DE EDUCACIÓN — PROVINCIA DE SAN JUAN');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E293B']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $tabNombres = [
            'kpi' => 'RESUMEN EJECUTIVO Y AUDITORÍA POR CENTRO SALARIAL',
            'escala' => 'ESCALAS RESIDUALES Y TRANSICIÓN SALARIAL',
            'cruce' => 'MATRIZ DE RELACIÓN DE ESCUELAS Y SECTORES PRESUPUESTARIOS',
            'paga_mas' => 'ESTABLECIMIENTOS QUE PAGAN MÁS QUE SU RADIO SIGE',
            'paga_menos' => 'ESTABLECIMIENTOS QUE PAGAN MENOS QUE SU RADIO SIGE',
            'zonas' => 'INCONSISTENCIA DE ZONAS GEOGRÁFICAS',
            'conflictos' => 'SECTORES SIGE CON CONFLICTO INTERNO',
            'sin_escuela' => 'SECTORES DE NÓMINA DESVINCULADOS DE ESTABLECIMIENTOS',
            'tracking' => 'SEGUIMIENTO Y GESTIÓN ADMINISTRATIVA',
            'gestion' => 'SEGUIMIENTO Y GESTIÓN ADMINISTRATIVA',
        ];

        $nombrePestana = $tabNombres[$tab] ?? 'REPORTE DE AUDITORÍA SALARIAL';

        $sheet->mergeCells("A2:{$lastColLetter}2");
        $sheet->setCellValue('A2', $nombrePestana.' | Nómina: '.$nominaSeleccionada->periodo.' | Emisión: '.date('d/m/Y H:i'));
        $sheet->getStyle('A2')->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FFFE8204']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF8FAFC']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(2)->setRowHeight(22);

        $headerStyle = [
            'font' => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFE8204']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFFFFFFF']]],
        ];

        $startRow = 4;

        if ($tab === 'kpi') {
            $headers = ['Centro', 'Tipo de Agente / Repartición Liquidadora', 'Sectores Auditados', 'Coinciden', 'Pagan Más', 'Pagan Menos', 'Sin SIGE', 'Personal Afectado', 'Coincidencia (%)'];
            $sheet->fromArray($headers, null, 'A'.$startRow);
            $sheet->getStyle('A4:I4')->applyFromArray($headerStyle);
            $sheet->getRowDimension(4)->setRowHeight(24);

            $resultados = AuditoriaRadioResultado::where('nomina_id', $nominaId)->get();
            $centrosBreakdown = $resultados->groupBy('centro')->map(function ($group, $centroKey) use ($nombresCentros) {
                $totalSectores = $group->count();
                $personal = $group->sum('total_filas_docentes');
                $coinciden = $group->whereIn('estado_auditoria', ['COINCIDE_TOTAL', 'COINCIDE_SIGE', 'COINCIDE_SIGE_Y_CAMINO', 'COINCIDE_SIGE_Y_CIRC'])->count();
                $pagaMas = $group->where('estado_auditoria', 'PAGA_MAS_QUE_SIGE')->count();
                $pagaMenos = $group->where('estado_auditoria', 'PAGA_MENOS_QUE_SIGE')->count();
                $sinSige = $group->where('estado_auditoria', 'SIN_SIGE')->count();

                $nombre = isset($nombresCentros[(int) $centroKey]) ? $nombresCentros[(int) $centroKey] : 'Repartición Salarial';

                return [
                    'centro' => $centroKey ?: 'S/D',
                    'nombre_centro' => $nombre,
                    'sectores' => $totalSectores,
                    'coinciden' => $coinciden,
                    'paga_mas' => $pagaMas,
                    'paga_menos' => $pagaMenos,
                    'sin_sige' => $sinSige,
                    'personal' => $personal,
                    'tasa' => $totalSectores > 0 ? round(($coinciden / $totalSectores) * 100, 1) : 0,
                ];
            })->values()->sortByDesc('personal')->values();

            $r = 5;
            foreach ($centrosBreakdown as $cb) {
                $sheet->setCellValue('A'.$r, $cb['centro']);
                $sheet->setCellValue('B'.$r, $cb['nombre_centro']);
                $sheet->setCellValue('C'.$r, $cb['sectores']);
                $sheet->setCellValue('D'.$r, $cb['coinciden']);
                $sheet->setCellValue('E'.$r, $cb['paga_mas']);
                $sheet->setCellValue('F'.$r, $cb['paga_menos']);
                $sheet->setCellValue('G'.$r, $cb['sin_sige']);
                $sheet->setCellValue('H'.$r, $cb['personal']);
                $sheet->setCellValue('I'.$r, $cb['tasa'].'%');

                $sheet->getStyle('A'.$r.':I'.$r)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle('A'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('C'.$r.':I'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('H'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $r++;
            }
        } elseif ($tab === 'escala') {
            $headers = ['Centro', 'Sector', 'CUE', 'Establecimiento / Escuela', 'Porcentaje Pagado (%)', 'Escala Detectada', 'Dictamen Auditor', 'Decreto / Norma Aval', 'Notas Auditor'];
            $sheet->fromArray($headers, null, 'A'.$startRow);
            $sheet->getStyle('A4:I4')->applyFromArray($headerStyle);
            $sheet->getRowDimension(4)->setRowHeight(24);

            $rows = AuditoriaSueldoRegistroViejo::where('nomina_id', $nominaId)->get();

            $r = 5;
            foreach ($rows as $v) {
                $sheet->setCellValue('A'.$r, $v->centro ?? 'S/D');
                $sheet->setCellValue('B'.$r, $v->sector ?? 'S/D');
                $sheet->setCellValue('C'.$r, $v->cue ?? 'S/D');
                $sheet->setCellValue('D'.$r, $v->nombre_establecimiento ?? 'Sin Registro');
                $sheet->setCellValue('E'.$r, $v->porcentaje_pagado ? $v->porcentaje_pagado.'%' : '-');
                $escalaText = ($v->escala_detectada === 'LEY HISTORICA' || $v->escala_detectada === 'VIEJA') ? 'Ley Histórica' : 'Ley Paritaria';
                $sheet->setCellValue('F'.$r, $escalaText);
                $sheet->setCellValue('G'.$r, $v->clasificacion_auditor);
                $sheet->setCellValue('H'.$r, $v->resolucion_aval ?? '-');
                $sheet->setCellValue('I'.$r, $v->notes_auditor ?? $v->notas_auditor ?? '-');

                $sheet->getStyle('A'.$r.':I'.$r)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle('A'.$r.':C'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('E'.$r.':H'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $r++;
            }
        } elseif ($tab === 'cruce') {
            $headers = [
                'CUE', 'Establecimiento / Escuela', 'Departamento', 'Nivel Educativo', 'Dirección de Área',
                'Centro', 'Sector SIGE', 'Sector Sueldos', 'Radio SIGE', 'Radio Sueldo',
                'Coincide SIGE vs Sueldo', 'Porcentaje Pagado', 'Escala / Ley Aplicada',
                'Radio Circunferencia', 'Radio Camino', 'Distancia Camino', 'Personal Afectado',
            ];
            $sheet->fromArray($headers, null, 'A'.$startRow);
            $sheet->getStyle('A4:Q4')->applyFromArray($headerStyle);
            $sheet->getRowDimension(4)->setRowHeight(24);

            $cruceEscuelas = DB::table('establecimientos as e')
                ->join('edificios as ed', 'ed.id', '=', 'e.edificio_id')
                ->join('modalidades as m', 'm.establecimiento_id', '=', 'e.id')
                ->leftJoin('auditoria_radio_resultados as r', function ($join) use ($nominaId) {
                    $join->on(DB::raw('CAST(m.sector AS INTEGER)'), '=', 'r.sector')
                        ->where('r.nomina_id', '=', $nominaId);
                })
                ->whereNull('e.deleted_at')
                ->whereNull('m.deleted_at')
                ->select(
                    'e.cue',
                    'e.nombre as nombre_establecimiento',
                    'ed.zona_departamento as departamento',
                    'm.nivel_educativo',
                    'm.direccion_area',
                    'm.sector as sector_sige',
                    'm.radio as radio_sige',
                    'r.centro as centro',
                    'r.sector as sector_sueldos',
                    'r.radio_sueldo',
                    'r.radio_circ',
                    'r.radio_camino',
                    'r.porc_pagado_mediana',
                    'r.total_filas_docentes',
                    'ed.distancia_camino as dist_camino'
                )
                ->orderBy('e.nombre')
                ->get();

            $r = 5;
            foreach ($cruceEscuelas as $c) {
                $hasCue = ! empty($c->cue);
                $rSige = $c->radio_sige;
                $rSueldo = $c->radio_sueldo;
                $rCirc = $c->radio_circ;
                $rCamino = $c->radio_camino;
                $distCamino = $c->dist_camino;

                if (! $hasCue || ! $rSige || $rSueldo === null) {
                    $coincideSige = '⚪ No Aplica';
                } elseif ($rSige == $rSueldo) {
                    $coincideSige = '🟢 SI';
                } elseif ($rSueldo > $rSige) {
                    $coincideSige = '🔴 MÁS (+'.($rSueldo - $rSige).')';
                } else {
                    $coincideSige = '🔵 MENOS (-'.($rSige - $rSueldo).')';
                }

                $escala = '-';
                if ($c->porc_pagado_mediana) {
                    $escala = 'Ley Paritaria';
                    if (in_array((float) $c->porc_pagado_mediana, [20, 30, 80, 100, 120, 140])) {
                        $escala = 'Ley Histórica';
                    } elseif (! in_array((float) $c->porc_pagado_mediana, [40, 50, 60, 95, 115, 135, 155])) {
                        $escala = 'Adicional Jerárquico';
                    }
                }

                $coincideCirc = (! $hasCue || ! $rCirc) ? '⚪ No Aplica' : (($rSueldo == $rCirc) ? '🟢 SI' : '🔴 NO (R'.$rCirc.')');
                $coincideCamino = (! $hasCue || ! $rCamino) ? '⚪ No Aplica' : (($rSueldo == $rCamino) ? '🟢 SI' : '🔴 NO (R'.$rCamino.')');
                $distText = ($hasCue && $distCamino !== null) ? '📍 '.number_format((float) $distCamino, 1, ',', '.').' km' : 'No Aplica';

                $sheet->setCellValue('A'.$r, $c->cue ?? 'S/D');
                $sheet->setCellValue('B'.$r, $c->nombre_establecimiento);
                $sheet->setCellValue('C'.$r, $c->departamento ?? 'S/D');
                $sheet->setCellValue('D'.$r, $c->nivel_educativo ?? '-');
                $sheet->setCellValue('E'.$r, $c->direccion_area ?? '-');
                $sheet->setCellValue('F'.$r, $c->centro ?? 'S/D');
                $sheet->setCellValue('G'.$r, $c->sector_sige ?? '0');
                $sheet->setCellValue('H'.$r, $c->sector_sueldos ?? '-');
                $sheet->setCellValue('I'.$r, $rSige ? 'Radio '.$rSige : '-');
                $sheet->setCellValue('J'.$r, $rSueldo !== null ? 'Radio '.$rSueldo : '-');
                $sheet->setCellValue('K'.$r, $coincideSige);
                $sheet->setCellValue('L'.$r, $c->porc_pagado_mediana ? $c->porc_pagado_mediana.'%' : '-');
                $sheet->setCellValue('M'.$r, $escala);
                $sheet->setCellValue('N'.$r, $coincideCirc);
                $sheet->setCellValue('O'.$r, $coincideCamino);
                $sheet->setCellValue('P'.$r, $distText);
                $sheet->setCellValue('Q'.$r, $c->total_filas_docentes ?? 0);

                $sheet->getStyle('A'.$r.':Q'.$r)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle('A'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('F'.$r.':L'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('N'.$r.':P'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('Q'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $r++;
            }
        } elseif ($tab === 'conflictos') {
            $headers = [
                'Sector SIGE', 'Radios Distintos SIGE', 'Niveles Afectados',
                'CUE Escuela', 'Establecimiento', 'CUI Edificio', 'Departamento',
                'Radio Modalidad (SIGE)', 'Ámbito', 'Centro Salarial', 'Radio Sueldo (A04)', 'Cant. Modalidades',
            ];
            $sheet->fromArray($headers, null, 'A'.$startRow);
            $sheet->getStyle('A4:L4')->applyFromArray($headerStyle);
            $sheet->getRowDimension(4)->setRowHeight(24);

            $conflictosSige = DB::table('modalidades as m')
                ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
                ->join('edificios as ed', 'ed.id', '=', 'e.edificio_id')
                ->leftJoin('auditoria_radio_resultados as r', function ($join) use ($nominaId) {
                    $join->on(DB::raw('CAST(m.sector AS INTEGER)'), '=', 'r.sector')
                        ->where('r.nomina_id', '=', $nominaId);
                })
                ->whereNull('m.deleted_at')
                ->whereNull('e.deleted_at')
                ->select(
                    DB::raw('CAST(m.sector AS INTEGER) as sector'),
                    DB::raw('GROUP_CONCAT(DISTINCT m.radio) as radios_distintos'),
                    DB::raw('GROUP_CONCAT(DISTINCT m.direccion_area) as niveles'),
                    DB::raw("GROUP_CONCAT(e.nombre || '||' || e.cue || '||' || ed.cui || '||' || COALESCE(ed.zona_departamento, 'S/D') || '||' || m.radio || '||' || m.ambito || '||' || COALESCE(r.centro, '') || '||' || COALESCE(r.sector, '') || '||' || COALESCE(r.radio_sueldo, ''), '###') as establecimientos_detallados"),
                    DB::raw('COUNT(m.id) as cant_modalidades')
                )
                ->groupBy(DB::raw('CAST(m.sector AS INTEGER)'))
                ->havingRaw('COUNT(DISTINCT m.radio) > 1')
                ->orderBy(DB::raw('CAST(m.sector AS INTEGER)'))
                ->get();

            $r = 5;
            foreach ($conflictosSige as $c) {
                $parsedRaw = [];
                if ($c->establecimientos_detallados) {
                    $items = explode('###', $c->establecimientos_detallados);
                    foreach ($items as $item) {
                        $parts = explode('||', $item);
                        $parsedRaw[] = [
                            'nombre' => $parts[0] ?? '',
                            'cue' => $parts[1] ?? '',
                            'cui' => $parts[2] ?? '',
                            'departamento' => $parts[3] ?? 'S/D',
                            'radio' => $parts[4] ?? '',
                            'ambito' => $parts[5] ?? '',
                            'centro' => $parts[6] ?? '',
                            'sector_sueldos' => $parts[7] ?? '',
                            'radio_sueldo' => $parts[8] ?? '',
                        ];
                    }
                }

                $uniqueEsts = [];
                foreach ($parsedRaw as $est) {
                    $key = $est['cue'].'-'.$est['radio'].'-'.$est['ambito'].'-'.$est['centro'];
                    $uniqueEsts[$key] = $est;
                }

                foreach ($uniqueEsts as $est) {
                    $sheet->setCellValue('A'.$r, $c->sector);
                    $sheet->setCellValue('B'.$r, '['.$c->radios_distintos.']');
                    $sheet->setCellValue('C'.$r, $c->niveles);
                    $sheet->setCellValue('D'.$r, $est['cue']);
                    $sheet->setCellValue('E'.$r, $est['nombre']);
                    $sheet->setCellValue('F'.$r, $est['cui']);
                    $sheet->setCellValue('G'.$r, $est['departamento']);
                    $sheet->setCellValue('H'.$r, $est['radio'] ? 'Radio '.$est['radio'] : '-');
                    $sheet->setCellValue('I'.$r, $est['ambito']);
                    $sheet->setCellValue('J'.$r, $est['centro'] ?: '-');
                    $sheet->setCellValue('K'.$r, $est['radio_sueldo'] !== '' ? 'Radio '.$est['radio_sueldo'] : '-');
                    $sheet->setCellValue('L'.$r, $c->cant_modalidades);

                    $sheet->getStyle('A'.$r.':L'.$r)->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ]);
                    $sheet->getStyle('A'.$r.':D'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle('F'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle('H'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle('K'.$r.':L'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $r++;
                }
            }
        } elseif ($tab === 'paga_mas' || $tab === 'paga_menos' || $tab === 'tracking' || $tab === 'gestion') {
            $headers = [
                'Centro', 'Sector', 'CUE', 'Establecimiento / Escuela',
                'Radio SIGE', 'Radio Sueldo', 'Coincide SIGE vs Sueldo',
                'Porcentaje Pagado', 'Ley / Escala Aplicada',
                'Radio Circunferencia', 'Radio Camino', 'Distancia Camino',
                'Personal Afectado', 'Estado Gestión', 'Notas / Observaciones',
            ];
            $sheet->fromArray($headers, null, 'A'.$startRow);
            $sheet->getStyle('A4:O4')->applyFromArray($headerStyle);
            $sheet->getRowDimension(4)->setRowHeight(24);

            $query = DB::table('auditoria_radio_resultados as r')
                ->where('r.nomina_id', $nominaId)
                ->leftJoin('establecimientos as e', 'e.cue', '=', 'r.cue')
                ->leftJoin('edificios as ed', 'ed.id', '=', 'e.edificio_id')
                ->select(
                    'r.*',
                    'ed.distancia_camino as dist_camino',
                    'ed.dist_circunf'
                );

            if ($tab === 'paga_mas') {
                $query->whereNotNull('r.cue')->where('r.cue', '!=', '')->where('r.estado_auditoria', 'PAGA_MAS_QUE_SIGE');
            } elseif ($tab === 'paga_menos') {
                $query->whereNotNull('r.cue')->where('r.cue', '!=', '')->where('r.estado_auditoria', 'PAGA_MENOS_QUE_SIGE');
            } else {
                // tracking / gestion
                $query->whereNotNull('r.cue')->where('r.cue', '!=', '');
            }

            $rows = $query->orderBy('r.sector', 'asc')->get();

            $r = 5;
            foreach ($rows as $item) {
                $hasCue = ! empty($item->cue);
                $rSige = $item->radio_sige;
                $rSueldo = $item->radio_sueldo;
                $rCirc = $item->radio_circ;
                $rCamino = $item->radio_camino;
                $distCamino = $item->dist_camino;

                if (! $hasCue || ! $rSige || $rSueldo === null) {
                    $coincideSige = '⚪ No Aplica';
                } elseif ($rSige == $rSueldo) {
                    $coincideSige = '🟢 SI';
                } elseif ($rSueldo > $rSige) {
                    $coincideSige = '🔴 MÁS (+'.($rSueldo - $rSige).')';
                } else {
                    $coincideSige = '🔵 MENOS (-'.($rSige - $rSueldo).')';
                }

                $escala = '-';
                if ($item->porc_pagado_mediana) {
                    $escala = 'Ley Paritaria';
                    if (in_array((float) $item->porc_pagado_mediana, [20, 30, 80, 100, 120, 140])) {
                        $escala = 'Ley Histórica';
                    } elseif (! in_array((float) $item->porc_pagado_mediana, [40, 50, 60, 95, 115, 135, 155])) {
                        $escala = 'Adicional Jerárquico';
                    }
                }

                $coincideCirc = (! $hasCue || ! $rCirc) ? '⚪ No Aplica' : (($rSueldo == $rCirc) ? '🟢 SI' : '🔴 NO (R'.$rCirc.')');
                $coincideCamino = (! $hasCue || ! $rCamino) ? '⚪ No Aplica' : (($rSueldo == $rCamino) ? '🟢 SI' : '🔴 NO (R'.$rCamino.')');
                $distText = ($hasCue && $distCamino !== null) ? '📍 '.number_format((float) $distCamino, 1, ',', '.').' km' : 'No Aplica';

                $sheet->setCellValue('A'.$r, $item->centro ?? 'S/D');
                $sheet->setCellValue('B'.$r, $item->sector);
                $sheet->setCellValue('C'.$r, $item->cue ?? 'S/D');
                $sheet->setCellValue('D'.$r, $item->nombre_establecimiento ?? 'Sin Registro en SIGE');
                $sheet->setCellValue('E'.$r, $rSige ? 'Radio '.$rSige : '-');
                $sheet->setCellValue('F'.$r, $rSueldo ? 'Radio '.$rSueldo : '-');
                $sheet->setCellValue('G'.$r, $coincideSige);
                $sheet->setCellValue('H'.$r, $item->porc_pagado_mediana ? $item->porc_pagado_mediana.'%' : '-');
                $sheet->setCellValue('I'.$r, $escala);
                $sheet->setCellValue('J'.$r, $coincideCirc);
                $sheet->setCellValue('K'.$r, $coincideCamino);
                $sheet->setCellValue('L'.$r, $distText);
                $sheet->setCellValue('M'.$r, $item->total_filas_docentes ?? 0);
                $sheet->setCellValue('N'.$r, $item->estado_gestion);
                $sheet->setCellValue('O'.$r, $item->notes_auditor ?? $item->notas_auditor ?? '');

                $sheet->getStyle('A'.$r.':O'.$r)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle('A'.$r.':C'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('E'.$r.':L'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('M'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle('N'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $r++;
            }
        } elseif ($tab === 'zonas') {
            $headers = [
                'Centro', 'Sector', 'CUE', 'Establecimiento / Escuela',
                'Zona Sueldos', 'Zona SIGE', 'Radio SIGE', 'Radio Sueldo', 'Coincide SIGE vs Sueldo',
                'Radio Circunferencia', 'Radio Camino', 'Distancia Camino', 'Personal Afectado',
            ];
            $sheet->fromArray($headers, null, 'A'.$startRow);
            $sheet->getStyle('A4:M4')->applyFromArray($headerStyle);
            $sheet->getRowDimension(4)->setRowHeight(24);

            $rows = DB::table('auditoria_radio_resultados as r')
                ->where('r.nomina_id', $nominaId)
                ->leftJoin('establecimientos as e', 'e.cue', '=', 'r.cue')
                ->leftJoin('edificios as ed', 'ed.id', '=', 'e.edificio_id')
                ->select(
                    'r.*',
                    'ed.distancia_camino as dist_camino',
                    'ed.dist_circunf'
                )
                ->whereNotNull('r.cue')
                ->where('r.cue', '!=', '')
                ->where('r.coincide_zona', false)
                ->whereNotNull('r.zona_sige')
                ->orderBy('r.sector', 'asc')
                ->get();

            $r = 5;
            foreach ($rows as $item) {
                $hasCue = ! empty($item->cue);
                $rSige = $item->radio_sige;
                $rSueldo = $item->radio_sueldo;
                $rCirc = $item->radio_circ;
                $rCamino = $item->radio_camino;
                $distCamino = $item->dist_camino;

                if (! $hasCue || ! $rSige || $rSueldo === null) {
                    $coincideSige = '⚪ No Aplica';
                } elseif ($rSige == $rSueldo) {
                    $coincideSige = '🟢 SI';
                } elseif ($rSueldo > $rSige) {
                    $coincideSige = '🔴 MÁS (+'.($rSueldo - $rSige).')';
                } else {
                    $coincideSige = '🔵 MENOS (-'.($rSige - $rSueldo).')';
                }

                $coincideCirc = (! $hasCue || ! $rCirc) ? '⚪ No Aplica' : (($rSueldo == $rCirc) ? '🟢 SI' : '🔴 NO (R'.$rCirc.')');
                $coincideCamino = (! $hasCue || ! $rCamino) ? '⚪ No Aplica' : (($rSueldo == $rCamino) ? '🟢 SI' : '🔴 NO (R'.$rCamino.')');
                $distText = ($hasCue && $distCamino !== null) ? '📍 '.number_format((float) $distCamino, 1, ',', '.').' km' : 'No Aplica';

                $sheet->setCellValue('A'.$r, $item->centro ?? 'S/D');
                $sheet->setCellValue('B'.$r, $item->sector);
                $sheet->setCellValue('C'.$r, $item->cue ?? 'S/D');
                $sheet->setCellValue('D'.$r, $item->nombre_establecimiento ?? 'Sin Registro en SIGE');
                $sheet->setCellValue('E'.$r, $item->zona_sueldo ?? '-');
                $sheet->setCellValue('F'.$r, $item->zona_sige ?? '-');
                $sheet->setCellValue('G'.$r, $rSige ? 'Radio '.$rSige : '-');
                $sheet->setCellValue('H'.$r, $rSueldo ? 'Radio '.$rSueldo : '-');
                $sheet->setCellValue('I'.$r, $coincideSige);
                $sheet->setCellValue('J'.$r, $coincideCirc);
                $sheet->setCellValue('K'.$r, $coincideCamino);
                $sheet->setCellValue('L'.$r, $distText);
                $sheet->setCellValue('M'.$r, $item->total_filas_docentes ?? 0);

                $sheet->getStyle('A'.$r.':M'.$r)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle('A'.$r.':C'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('E'.$r.':L'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('M'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $r++;
            }
        } elseif ($tab === 'sin_escuela') {
            $headers = [
                'Centro', 'Sector', 'Estado Auditoría', 'Radio Sueldo (A04)', 'Porcentaje Pagado (%)', 'Docentes Afectados', 'Detalle / Notas',
            ];
            $sheet->fromArray($headers, null, 'A'.$startRow);
            $sheet->getStyle('A4:G4')->applyFromArray($headerStyle);
            $sheet->getRowDimension(4)->setRowHeight(24);

            $rows = DB::table('auditoria_radio_resultados as r')
                ->where('r.nomina_id', $nominaId)
                ->where(function ($q) {
                    $q->whereNull('r.cue')->orWhere('r.cue', '');
                })
                ->orderBy('r.sector', 'asc')
                ->get();

            $r = 5;
            foreach ($rows as $item) {
                $sheet->setCellValue('A'.$r, $item->centro ?? 'S/D');
                $sheet->setCellValue('B'.$r, $item->sector);
                $sheet->setCellValue('C'.$r, $item->estado_auditoria);
                $sheet->setCellValue('D'.$r, $item->radio_sueldo ? 'Radio '.$item->radio_sueldo : '-');
                $sheet->setCellValue('E'.$r, $item->porc_pagado_mediana ? $item->porc_pagado_mediana.'%' : '-');
                $sheet->setCellValue('F'.$r, $item->total_filas_docentes ?? 0);
                $sheet->setCellValue('G'.$r, $item->notas_auditor ?? '');

                $sheet->getStyle('A'.$r.':G'.$r)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle('A'.$r.':E'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('F'.$r)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $r++;
            }
        } else {
            $sheet->setCellValue('A4', 'Pestaña no válida o sin datos para exportar.');
        }

        foreach (range('A', $lastColLetter) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->freezePane('A5');

        if ($tab === 'kpi') {
            $filename = 'auditoria_centros_'.$nominaSeleccionada->periodo.'.xlsx';
        } elseif ($tab === 'cruce') {
            $filename = 'Auditoria_Escuelas_Sectores_'.$nominaSeleccionada->periodo.'.xlsx';
        } elseif ($tab === 'paga_mas') {
            $filename = 'Auditoria_Pagan_Mas_'.$nominaSeleccionada->periodo.'.xlsx';
        } elseif ($tab === 'paga_menos') {
            $filename = 'Auditoria_Pagan_Menos_'.$nominaSeleccionada->periodo.'.xlsx';
        } elseif ($tab === 'conflictos') {
            $filename = 'Auditoria_Conflictos_SIGE_'.$nominaSeleccionada->periodo.'.xlsx';
        } elseif ($tab === 'zonas') {
            $filename = 'Auditoria_Inconsistencia_Zona_'.$nominaSeleccionada->periodo.'.xlsx';
        } elseif ($tab === 'tracking' || $tab === 'gestion') {
            $filename = 'Auditoria_Seguimiento_Gestion_'.$nominaSeleccionada->periodo.'.xlsx';
        } elseif ($tab === 'sin_escuela') {
            $filename = 'Auditoria_Sectores_Sin_Escuela_'.$nominaSeleccionada->periodo.'.xlsx';
        } else {
            $filename = 'auditoria_'.$tab.'_'.$nominaSeleccionada->periodo.'.xlsx';
        }

        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
