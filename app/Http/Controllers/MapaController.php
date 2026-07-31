<?php

namespace App\Http\Controllers;

use App\Models\Edificio;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MapaController extends Controller
{
    /**
     * Display the school map.
     */
    public function index(Request $request): Response
    {
        $result = collect();

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
                    $esPriv = stripos($mod->ambito, 'privado') !== false || $mod->sector == 2;
                    if ($esPriv) {
                        $esPrivado = true;
                    }
                    $mappedModalidades[] = [
                        'id' => $mod->id,
                        'nivel' => $mod->nivel_educativo,
                        'area' => $mod->direccion_area,
                        'radio' => $mod->radio ?? 'N/A',
                        'radio_sige' => $mod->radio_sige ?? 'N/A',
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

        $edificiosArray = $result->toArray();

        return Inertia::render('Mapa', [
            'edificios' => $edificiosArray,
        ]);
    }

    /**
     * Export full Mapa Escolar report to Excel.
     */
    public function exportExcel(\App\Services\ExcelExportService $exportService)
    {
        $edificios = Edificio::with([
            'establecimientos',
            'establecimientos.modalidades',
            'cabecera',
        ])->get();

        $headers = [
            'CUI', 'CUE', 'Nombre Establecimiento', 'CUE Cabecera', 'Nombre Establecimiento Cabecera',
            'Dirección Área', 'Nivel Educativo', 'Ámbito', 'Sector', 'Categoría',
            'Letra Zona', 'Localidad', 'Zona Departamento', 'Radio', 'Punto de Partida',
            'Dist. Circunferencia', 'Radio Circunferencia', 'Dist. Camino', 'Radio Camino',
            'Tiempo Google Auto', 'Radio SiGE', 'Estado'
        ];

        [$spreadsheet, $sheet] = $exportService->setupSheet('Mapa Escolar', $headers);

        $row = 2;
        foreach ($edificios as $edificio) {
            $cabeceraCue = $edificio->cabecera?->cue;
            $cabeceraNombre = $edificio->cabecera?->nombre;

            foreach ($edificio->establecimientos as $est) {
                foreach ($est->modalidades as $mod) {
                    $esPrivado = stripos($mod->ambito, 'privado') !== false || $mod->sector == 2;
                    $ambito = $esPrivado ? 'PRIVADO' : 'PUBLICO';

                    $sRaw = $mod->radio ?? $mod->radio_sige;
                    $s = ($sRaw !== null && $sRaw !== '' && $sRaw !== 'N/A') ? (int)$sRaw : null;
                    if ($s === 7) $s = 6;

                    $circ = $edificio->radio_circ ? (int)$edificio->radio_circ : null;
                    $camino = $edificio->radio_camino ? (int)$edificio->radio_camino : null;

                    $estado = 'COINCIDE';
                    if (!$esPrivado && $edificio->punto_partida && !is_null($s) && !$mod->radio_justificado) {
                        $hasCirc = !is_null($circ);
                        $hasCamino = !is_null($camino);

                        if ($hasCirc && $hasCamino) {
                            if ($s === $circ && $s === $camino) {
                                $estado = 'COINCIDE';
                            } elseif ($s === $circ || $s === $camino) {
                                $estado = 'INCONGRUENTE';
                            } else {
                                $estado = 'DISTINTO';
                            }
                        } elseif ($hasCirc) {
                            $estado = ($s === $circ) ? 'COINCIDE' : 'DISTINTO';
                        } elseif ($hasCamino) {
                            $estado = ($s === $camino) ? 'COINCIDE' : 'DISTINTO';
                        }
                    }

                    $sheet->setCellValue('A'.$row, $edificio->cui);
                    $sheet->setCellValue('B'.$row, $est->cue);
                    $sheet->setCellValue('C'.$row, $est->nombre);
                    $sheet->setCellValue('D'.$row, $cabeceraCue);
                    $sheet->setCellValue('E'.$row, $cabeceraNombre);
                    $sheet->setCellValue('F'.$row, $mod->direccion_area);
                    $sheet->setCellValue('G'.$row, $mod->nivel_educativo);
                    $sheet->setCellValue('H'.$row, $ambito);
                    $sheet->setCellValue('I'.$row, $mod->sector);
                    $sheet->setCellValue('J'.$row, $mod->categoria);
                    $sheet->setCellValue('K'.$row, $edificio->letra_zona);
                    $sheet->setCellValue('L'.$row, $edificio->localidad);
                    $sheet->setCellValue('M'.$row, $edificio->zona_departamento);
                    $sheet->setCellValue('N'.$row, $mod->radio);
                    $sheet->setCellValue('O'.$row, $edificio->punto_partida);
                    $sheet->setCellValue('P'.$row, $edificio->dist_circunf);
                    $sheet->setCellValue('Q'.$row, $edificio->radio_circ);
                    $sheet->setCellValue('R'.$row, $edificio->distancia_camino);
                    $sheet->setCellValue('S'.$row, $edificio->radio_camino);
                    $sheet->setCellValue('T'.$row, $edificio->tiempo_google_auto);
                    $sheet->setCellValue('U'.$row, $mod->radio_sige);
                    $sheet->setCellValue('V'.$row, $estado);

                    $row++;
                }
            }
        }

        $exportService->autoSizeColumns($sheet, count($headers));

        $filename = 'reporte_mapa_escolar_'.date('Y-m-d').'.xlsx';
        return $exportService->download($spreadsheet, $filename);
    }
}

