<?php

namespace App\Http\Controllers;

use App\Models\Edificio;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MapaController extends Controller
{
    /**
     * Display the school map.
     */
    public function index(Request $request): Response
    {
        $result = collect();

        // Cargar auditoria de sueldos por sector y por cue
        $ultimaNominaId = DB::table('nominas_sueldos')->orderBy('periodo', 'desc')->value('id');

        $auditoriaBySector = DB::table('auditoria_radio_resultados')
            ->where('nomina_id', $ultimaNominaId)
            ->whereNotNull('sector')
            ->select('centro', 'sector', 'cue', 'radio_sueldo', 'porc_pagado_mediana', 'estado_auditoria')
            ->get()
            ->keyBy(function ($item) {
                return (int)$item->sector;
            });

        $auditoriaByCue = DB::table('auditoria_radio_resultados')
            ->where('nomina_id', $ultimaNominaId)
            ->whereNotNull('cue')
            ->select('centro', 'sector', 'cue', 'radio_sueldo', 'porc_pagado_mediana', 'estado_auditoria')
            ->get()
            ->keyBy(function ($item) {
                return (int)$item->cue;
            });

        $edificios = Edificio::select(
            'id', 'cui', 'latitud', 'longitud', 'localidad', 'calle', 'numero_puerta',
            'zona_departamento', 'punto_partida', 'dist_circunf', 'radio_circ',
            'distancia_camino', 'radio_camino', 'tiempo_google_auto', 'observacion'
        )
            ->whereNotNull('latitud')
            ->whereNotNull('longitud')
            ->whereHas('establecimientos.modalidades')
            ->with([
                'establecimientos:id,edificio_id,cue,nombre',
                'establecimientos.modalidades:id,establecimiento_id,ambito,radio,radio_sige,categoria,nivel_educativo,direccion_area,sector,observaciones,radio_observado',
            ])
            ->get();

        foreach ($edificios as $edificio) {
            $esPrivado = false;
            $mappedEstablecimientos = [];

            foreach ($edificio->establecimientos as $est) {
                $mappedModalidades = [];
                foreach ($est->modalidades as $mod) {
                    $esPriv = stripos($mod->ambito ?? '', 'privado') !== false;
                    if ($esPriv) {
                        $esPrivado = true;
                    }
                    
                    // Buscar auditoria sueldo por sector o por cue
                    $sec = $mod->sector ? (int)$mod->sector : null;
                    $cue = $est->cue ? (int)$est->cue : null;

                    $audData = ($sec && isset($auditoriaBySector[$sec]))
                        ? $auditoriaBySector[$sec]
                        : (($cue && isset($auditoriaByCue[$cue])) ? $auditoriaByCue[$cue] : null);

                    $mappedModalidades[] = [
                        'id' => $mod->id,
                        'sector' => $mod->sector,
                        'nivel' => $mod->nivel_educativo,
                        'area' => $mod->direccion_area,
                        'radio' => $mod->radio ?? 'N/A',
                        'radio_sige' => $mod->radio_sige ?? 'N/A',
                        'radio_sueldo' => $audData ? $audData->radio_sueldo : null,
                        'porc_sueldo' => $audData ? $audData->porc_pagado_mediana : null,
                        'estado_sueldo' => $audData ? $audData->estado_auditoria : 'SIN_DATO',
                        'categoria' => $mod->categoria ?? 'N/A',
                        'ambito' => $esPriv ? 'PRIVADO' : 'PUBLICO',
                        'observaciones' => $mod->observaciones ?? '',
                        'radio_observado' => !empty($mod->radio_observado),
                    ];
                }

                if (! empty($mappedModalidades)) {
                    $mappedEstablecimientos[] = [
                        'nombre' => $est->nombre,
                        'cue' => $est->cue,
                        'modalidades' => $mappedModalidades,
                    ];
                }
            }

            if (! empty($mappedEstablecimientos)) {
                $result->push([
                    'id' => $edificio->id,
                    'cui' => $edificio->cui,
                    'latitud' => (float) $edificio->latitud,
                    'longitud' => (float) $edificio->longitud,
                    'localidad' => $edificio->localidad ?? 'Sin localidad',
                    'calle' => $edificio->calle ?? 'Sin dirección',
                    'numero_puerta' => $edificio->numero_puerta ?? 'S/N',
                    'zona_departamento' => $edificio->zona_departamento ?? '',
                    'ambito' => $esPrivado ? 'PRIVADO' : 'PUBLICO',
                    'establecimientos' => $mappedEstablecimientos,
                    'punto_partida' => $edificio->punto_partida,
                    'dist_circunf' => $edificio->dist_circunf,
                    'radio_circ' => $edificio->radio_circ,
                    'distancia_camino' => $edificio->distancia_camino,
                    'radio_camino' => $edificio->radio_camino,
                    'tiempo_google_auto' => $edificio->tiempo_google_auto,
                    'observacion' => $edificio->observacion,
                ]);
            }
        }

        return Inertia::render('Mapa', [
            'edificios' => $result->toArray(),
        ]);
    }

    /**
     * Display the school salary audit map (Mapa de Sueldos).
     */
    public function indexSueldos(Request $request): Response
    {
        $result = collect();

        $ultimaNominaId = DB::table('nominas_sueldos')->orderBy('periodo', 'desc')->value('id');

        // Cargar auditoria de sueldos por sector y por cue
        $auditoriaBySector = DB::table('auditoria_radio_resultados')
            ->where('nomina_id', $ultimaNominaId)
            ->whereNotNull('sector')
            ->select('centro', 'sector', 'cue', 'radio_sueldo', 'porc_pagado_mediana', 'estado_auditoria')
            ->get()
            ->keyBy(function ($item) {
                return (int)$item->sector;
            });

        $auditoriaByCue = DB::table('auditoria_radio_resultados')
            ->where('nomina_id', $ultimaNominaId)
            ->whereNotNull('cue')
            ->select('centro', 'sector', 'cue', 'radio_sueldo', 'porc_pagado_mediana', 'estado_auditoria')
            ->get()
            ->keyBy(function ($item) {
                return (int)$item->cue;
            });

        $edificios = Edificio::select(
            'id', 'cui', 'latitud', 'longitud', 'localidad', 'calle', 'numero_puerta',
            'zona_departamento', 'punto_partida', 'dist_circunf', 'radio_circ',
            'distancia_camino', 'radio_camino', 'tiempo_google_auto', 'observacion'
        )
            ->whereNotNull('latitud')
            ->whereNotNull('longitud')
            ->whereHas('establecimientos.modalidades')
            ->with([
                'establecimientos:id,edificio_id,cue,nombre',
                'establecimientos.modalidades:id,establecimiento_id,ambito,radio,radio_sige,categoria,nivel_educativo,direccion_area,sector,observaciones,radio_observado',
            ])
            ->get();

        foreach ($edificios as $edificio) {
            $esPrivado = false;
            $mappedEstablecimientos = [];

            foreach ($edificio->establecimientos as $est) {
                $mappedModalidades = [];
                foreach ($est->modalidades as $mod) {
                    $esPriv = stripos($mod->ambito ?? '', 'privado') !== false;
                    if ($esPriv) {
                        $esPrivado = true;
                    }
                    
                    $sec = $mod->sector ? (int)$mod->sector : null;
                    $cue = $est->cue ? (int)$est->cue : null;

                    $audData = ($sec && isset($auditoriaBySector[$sec]))
                        ? $auditoriaBySector[$sec]
                        : (($cue && isset($auditoriaByCue[$cue])) ? $auditoriaByCue[$cue] : null);

                    $estAud = $audData ? $audData->estado_auditoria : 'SIN_DATO';

                    // Clasificación de color salarial:
                    // 🟢 VERDE: Coincide (COINCIDE_TOTAL, COINCIDE_SIGE, etc.)
                    // 🟣 MORADO: Sobrepago (PAGA_MAS_QUE_SIGE)
                    // 🔵 AZUL: Subpago (PAGA_MENOS_QUE_SIGE)
                    // 🟡 AMARILLO: Sin registro SIGE
                    $colorAuditoria = 'COINCIDE';
                    if ($estAud === 'PAGA_MAS_QUE_SIGE') {
                        $colorAuditoria = 'SOBREPAGO';
                    } elseif ($estAud === 'PAGA_MENOS_QUE_SIGE') {
                        $colorAuditoria = 'SUBPAGO';
                    } elseif ($estAud === 'SIN_SIGE') {
                        $colorAuditoria = 'SIN_SIGE';
                    }

                    $mappedModalidades[] = [
                        'id' => $mod->id,
                        'sector' => $mod->sector,
                        'nivel' => $mod->nivel_educativo,
                        'area' => $mod->direccion_area,
                        'radio' => $mod->radio ?? 'N/A',
                        'radio_sige' => $mod->radio_sige ?? 'N/A',
                        'radio_sueldo' => $audData ? $audData->radio_sueldo : null,
                        'porc_sueldo' => $audData ? $audData->porc_pagado_mediana : null,
                        'estado_sueldo' => $estAud,
                        'color_sueldo' => $colorAuditoria,
                        'categoria' => $mod->categoria ?? 'N/A',
                        'ambito' => $esPriv ? 'PRIVADO' : 'PUBLICO',
                        'observaciones' => $mod->observaciones ?? '',
                        'radio_observado' => !empty($mod->radio_observado),
                    ];
                }

                if (! empty($mappedModalidades)) {
                    $mappedEstablecimientos[] = [
                        'nombre' => $est->nombre,
                        'cue' => $est->cue,
                        'modalidades' => $mappedModalidades,
                    ];
                }
            }

            if (! empty($mappedEstablecimientos)) {
                $result->push([
                    'id' => $edificio->id,
                    'cui' => $edificio->cui,
                    'latitud' => (float) $edificio->latitud,
                    'longitud' => (float) $edificio->longitud,
                    'localidad' => $edificio->localidad ?? 'Sin localidad',
                    'calle' => $edificio->calle ?? 'Sin dirección',
                    'numero_puerta' => $edificio->numero_puerta ?? 'S/N',
                    'zona_departamento' => $edificio->zona_departamento ?? '',
                    'ambito' => $esPrivado ? 'PRIVADO' : 'PUBLICO',
                    'establecimientos' => $mappedEstablecimientos,
                    'punto_partida' => $edificio->punto_partida,
                    'dist_circunf' => $edificio->dist_circunf,
                    'radio_circ' => $edificio->radio_circ,
                    'distancia_camino' => $edificio->distancia_camino,
                    'radio_camino' => $edificio->radio_camino,
                    'tiempo_google_auto' => $edificio->tiempo_google_auto,
                    'observacion' => $edificio->observacion,
                ]);
            }
        }

        return Inertia::render('MapaSueldos', [
            'edificios' => $result->toArray(),
        ]);
    }

    /**
     * Export all map data as an Excel file.
     * Replicates the COINCIDE / DISTINTO / INCONGRUENTE logic from the frontend.
     */
    public function exportExcel(): HttpResponse
    {
        $edificios = Edificio::select(
            'id', 'cui', 'letra_zona', 'codigo_postal', 'localidad',
            'zona_departamento', 'punto_partida', 'dist_circunf', 'radio_circ',
            'distancia_camino', 'radio_camino', 'tiempo_google_auto'
        )
            ->whereNotNull('latitud')
            ->whereNotNull('longitud')
            ->whereHas('establecimientos.modalidades')
            ->with([
                'establecimientos:id,edificio_id,cue,cue_edificio_principal,nombre,establecimiento_cabecera',
                'establecimientos.cabecera:id,cue,nombre',
                'establecimientos.modalidades:id,establecimiento_id,ambito,radio,radio_sige,radio_justificado,categoria,nivel_educativo,direccion_area,sector',
            ])
            ->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Mapa Escolar');

        // ── Headers ──────────────────────────────────────────────────────────
        $headers = [
            'A' => 'CUI',
            'B' => 'CUE',
            'C' => 'Nombre Establecimiento',
            'D' => 'CUE Cabecera',
            'E' => 'Nombre Establecimiento Cabecera',
            'F' => 'Dirección Área',
            'G' => 'Nivel Educativo',
            'H' => 'Ámbito',
            'I' => 'Sector',
            'J' => 'Categoría',
            'K' => 'Letra Zona',
            'L' => 'Localidad',
            'M' => 'Zona Departamento',
            'N' => 'Radio',
            'O' => 'Punto de Partida',
            'P' => 'Dist. Circunferencia',
            'Q' => 'Radio Circunferencia',
            'R' => 'Radio Camino',
            'S' => 'Estado',
        ];

        foreach ($headers as $col => $label) {
            $sheet->setCellValue($col.'1', $label);
        }

        // Header style: bold, orange background, white text, centered
        $headerRange = 'A1:S1';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 10],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFE8204']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE5E7EB']]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(20);

        // ── Data rows ────────────────────────────────────────────────────────
        $row = 2;
        foreach ($edificios as $edificio) {
            $radioCirc  = ($edificio->radio_circ   !== null && $edificio->radio_circ   !== '') ? (int) $edificio->radio_circ   : null;
            $radioCamino = ($edificio->radio_camino !== null && $edificio->radio_camino !== '') ? (int) $edificio->radio_camino : null;

            foreach ($edificio->establecimientos as $est) {
                $cabeceraObj = $est->cabecera;
                $cabeceraCue    = $cabeceraObj?->cue    ?? $est->cue_edificio_principal ?? '';
                $cabeceraName   = $cabeceraObj?->nombre ?? '';

                foreach ($est->modalidades as $mod) {
                    // Determine radio value (modal radio first, fallback to radio_sige)
                    $sysRaw = ($mod->radio !== null && $mod->radio !== '' && $mod->radio !== 'N/A')
                        ? $mod->radio
                        : $mod->radio_sige;
                    $s = ($sysRaw !== null && $sysRaw !== '' && $sysRaw !== 'N/A') ? (int) $sysRaw : null;
                    if ($s === 7) {
                        $s = 6;
                    }

                    // Calculate audit status — mirrors frontend logic exactly
                    $estado = 'COINCIDE';
                    if (! $mod->radio_justificado && $s !== null) {
                        $hasCirc   = $radioCirc   !== null;
                        $hasCamino = $radioCamino !== null;

                        if ($hasCirc && $hasCamino) {
                            if ($s === $radioCirc && $s === $radioCamino) {
                                $estado = 'COINCIDE';
                            } elseif ($s === $radioCirc || $s === $radioCamino) {
                                $estado = 'INCONGRUENTE';
                            } else {
                                $estado = 'DISTINTO';
                            }
                        } elseif ($hasCirc) {
                            $estado = ($s === $radioCirc) ? 'COINCIDE' : 'DISTINTO';
                        } elseif ($hasCamino) {
                            $estado = ($s === $radioCamino) ? 'COINCIDE' : 'DISTINTO';
                        }
                    }

                    $esPrivado = stripos($mod->ambito ?? '', 'privado') !== false || $mod->sector == 2;

                    $sheet->setCellValue('A'.$row, $edificio->cui);
                    $sheet->setCellValue('B'.$row, $est->cue);
                    $sheet->setCellValue('C'.$row, $est->nombre);
                    $sheet->setCellValue('D'.$row, $cabeceraCue);
                    $sheet->setCellValue('E'.$row, $cabeceraName);
                    $sheet->setCellValue('F'.$row, $mod->direccion_area ?? '');
                    $sheet->setCellValue('G'.$row, $mod->nivel_educativo ?? '');
                    $sheet->setCellValue('H'.$row, $esPrivado ? 'PRIVADO' : 'PUBLICO');
                    $sheet->setCellValue('I'.$row, $mod->sector ?? '');
                    $sheet->setCellValue('J'.$row, $mod->categoria ?? '');
                    $sheet->setCellValue('K'.$row, $edificio->letra_zona ?? '');
                    $sheet->setCellValue('L'.$row, $edificio->localidad ?? '');
                    $sheet->setCellValue('M'.$row, $edificio->zona_departamento ?? '');
                    $sheet->setCellValue('N'.$row, $sysRaw ?? '');
                    $sheet->setCellValue('O'.$row, $edificio->punto_partida ?? '');
                    $sheet->setCellValue('P'.$row, $edificio->dist_circunf ?? '');
                    $sheet->setCellValue('Q'.$row, $edificio->radio_circ ?? '');
                    $sheet->setCellValue('R'.$row, $edificio->radio_camino ?? '');
                    $sheet->setCellValue('S'.$row, $estado);

                    // Row background color by estado
                    $rowBgColor = match ($estado) {
                        'DISTINTO'     => 'FFFEF2F2', // red-50
                        'INCONGRUENTE' => 'FFFEFCE8', // yellow-50
                        default        => 'FFF0FDF4', // green-50
                    };
                    $sheet->getStyle('A'.$row.':S'.$row)->applyFromArray([
                        'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $rowBgColor]],
                        'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE5E7EB']]],
                        'font'      => ['size' => 9],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ]);

                    // Estado cell: bold colored text
                    $estadoColor = match ($estado) {
                        'DISTINTO'     => 'FFB91C1C', // red-700
                        'INCONGRUENTE' => 'FFB45309', // amber-700
                        default        => 'FF065F46', // emerald-800
                    };
                    $sheet->getStyle('S'.$row)->getFont()->setBold(true)->getColor()->setARGB($estadoColor);
                    $sheet->getStyle('S'.$row)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                    $sheet->getRowDimension($row)->setRowHeight(16);
                    $row++;
                }
            }
        }

        // ── Column widths ────────────────────────────────────────────────────
        $colWidths = [
            'A' => 12, 'B' => 12, 'C' => 32, 'D' => 14, 'E' => 32,
            'F' => 18, 'G' => 20, 'H' => 10, 'I' => 10, 'J' => 14,
            'K' => 10, 'L' => 20, 'M' => 22, 'N' => 8,  'O' => 16,
            'P' => 18, 'Q' => 18, 'R' => 14, 'S' => 14,
        ];
        foreach ($colWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Freeze the header row
        $sheet->freezePane('A2');

        // ── Stream download ──────────────────────────────────────────────────
        $filename = 'reporte_mapa_escolar_'.now()->format('Y-m-d').'.xlsx';

        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control'       => 'max-age=0',
        ]);
    }
}
