<?php

namespace App\Services;

use App\Models\Edificio;
use App\Models\Establecimiento;
use App\Models\Modalidad;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ExcelImportService
{
    public function importEstablecimientos(string $filePath): array
    {
        $reader = IOFactory::createReader('Xlsx');
        $spreadsheet = $reader->load($filePath);
        $worksheet = $spreadsheet->getActiveSheet();

        $stats = [
            'edificios' => 0,
            'establecimientos' => 0,
            'modalidades' => 0,
            'omitidos' => 0,
            'errores' => [],
        ];

        $skippedCount = 0;

        DB::beginTransaction();

        try {
            $rowIterator = $worksheet->getRowIterator(2); // Skip header

            foreach ($rowIterator as $row) {
                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);

                $data = [];
                foreach ($cellIterator as $cell) {
                    $data[] = $cell->getValue();
                }

                // Skip empty rows
                if (empty($data[4]) || empty($data[7])) { // CUE or CUI empty
                    continue;
                }
                // Mapear datos de la fila
                $rowData = $this->mapRowData($data); // Keep existing $data parameter for mapRowData

                // [CLEANUP] Evitar registros redundantes de modalidad ADULTOS
                $dirClean = strtoupper(trim($rowData['direccion_area'] ?? ''));
                $nivelClean = strtoupper(trim($rowData['nivel_educativo'] ?? ''));

                if ($nivelClean === 'ADULTOS') {
                    if ($dirClean === 'ADULTOS' || $dirClean === 'PRIVADA') {
                        $skippedCount++;

                        continue;
                    }
                }

                try {
                    // 1. Crear/obtener Edificio por CUI
                    $edificio = Edificio::firstOrCreate(
                        ['cui' => $rowData['cui']],
                        [
                            'calle' => $rowData['calle'],
                            'numero_puerta' => $rowData['numero_puerta'],
                            'orientacion' => $rowData['orientacion'],
                            'codigo_postal' => $rowData['codigo_postal'],
                            'localidad' => $rowData['localidad'],
                            'latitud' => $this->normalizeCoordinate($rowData['latitud']),
                            'longitud' => $this->normalizeCoordinate($rowData['longitud']),
                            'letra_zona' => $rowData['letra_zona'],
                            'zona_departamento' => $rowData['zona_departamento'],
                            'te_voip' => $rowData['te_voip'],
                        ]
                    );

                    if ($edificio->wasRecentlyCreated) {
                        $stats['edificios']++;
                    }

                    // 2. Crear/obtener Establecimiento por CUE
                    $establecimiento = Establecimiento::firstOrCreate(
                        ['cue' => $rowData['cue']],
                        [
                            'edificio_id' => $edificio->id,
                            'cue_edificio_principal' => $rowData['cue_edificio_principal'],
                            'nombre' => $rowData['nombre'],
                            'establecimiento_cabecera' => $rowData['establecimiento_cabecera'],
                        ]
                    );

                    if ($establecimiento->wasRecentlyCreated) {
                        $stats['establecimientos']++;
                    }

                    // 3. Crear Modalidad (cada fila del Excel)
                    Modalidad::create([
                        'establecimiento_id' => $establecimiento->id,
                        'direccion_area' => $rowData['direccion_area'],
                        'nivel_educativo' => $rowData['nivel_educativo'],
                        'sector' => $rowData['sector'],
                        'categoria' => $rowData['categoria'],
                        'inst_legal_categoria' => $rowData['inst_legal_categoria'],
                        'radio' => $rowData['radio'],
                        'inst_legal_radio' => $rowData['inst_legal_radio'],
                        'inst_legal_categoria_bis' => $rowData['inst_legal_categoria_bis'],
                        'inst_legal_creacion' => $rowData['inst_legal_creacion'],
                        'ambito' => strtoupper($rowData['ambito']),
                        'validado' => $rowData['validado'] === 'VALIDADO',
                    ]);

                    $stats['modalidades']++;

                } catch (\Exception $e) {
                    $stats['errores'][] = "Fila {$row->getRowIndex()}: {$e->getMessage()}";
                    Log::error("Error importando fila {$row->getRowIndex()}", [
                        'error' => $e->getMessage(),
                        'data' => $rowData,
                    ]);
                }
            }

            // Resolviendo nombres de cabecera a CUEs
            DB::statement("
                UPDATE establecimientos 
                SET establecimiento_cabecera = (
                    SELECT cue 
                    FROM establecimientos AS e 
                    WHERE e.nombre = establecimientos.establecimiento_cabecera 
                    LIMIT 1
                )
                WHERE establecimiento_cabecera IS NOT NULL 
                  AND establecimiento_cabecera != ''
                  AND establecimiento_cabecera NOT IN (SELECT cue FROM establecimientos);
            ");

            DB::statement("
                UPDATE establecimientos
                SET establecimiento_cabecera = (
                    SELECT cue 
                    FROM establecimientos AS e
                    WHERE e.edificio_id = establecimientos.edificio_id
                    ORDER BY (e.cue % 100 = 0) DESC, e.cue ASC
                    LIMIT 1
                )
                WHERE establecimiento_cabecera IS NOT NULL 
                  AND establecimiento_cabecera != ''
                  AND establecimiento_cabecera NOT IN (SELECT cue FROM establecimientos);
            ");

            DB::statement("
                UPDATE establecimientos
                SET establecimiento_cabecera = cue
                WHERE establecimiento_cabecera IS NULL 
                   OR establecimiento_cabecera = ''
                   OR establecimiento_cabecera NOT IN (SELECT cue FROM establecimientos);
            ");

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            $stats['errores'][] = "Error general: {$e->getMessage()}";
            Log::error('Error general en importación', ['error' => $e->getMessage()]);
        }

        $stats['omitidos'] = $skippedCount;

        return $stats;
    }

    private function sanitizeString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        // Force conversion to UTF-8 to handle special chars properly
        $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8, ISO-8859-1, WINDOWS-1252');
        // Remove non-breaking spaces and trim
        $value = str_replace("\xC2\xA0", ' ', $value);

        return trim($value) === '' ? null : trim($value);
    }

    private function mapRowData(array $data): array
    {
        return [
            'direccion_area' => $this->sanitizeString($data[0] ?? null),
            'nivel_educativo' => $this->sanitizeString($data[1] ?? null),
            'nombre' => $this->sanitizeString($data[2] ?? null),
            'sector' => $this->sanitizeString($data[3] ?? null),
            'cue' => $this->sanitizeString($data[4] ?? null),
            'cue_edificio_principal' => $this->sanitizeString($data[5] ?? null),
            'establecimiento_cabecera' => $this->sanitizeString($data[6] ?? null),
            'cui' => $this->sanitizeString($data[7] ?? null),
            'calle' => $this->sanitizeString($data[8] ?? null),
            'numero_puerta' => $this->sanitizeString($data[9] ?? 'S/N'),
            'orientacion' => $this->sanitizeString($data[10] ?? null),
            'codigo_postal' => $this->sanitizeString($data[11] ?? null),
            'localidad' => $this->sanitizeString($data[12] ?? null),
            'latitud' => $this->sanitizeString($data[13] ?? null),
            'longitud' => $this->sanitizeString($data[14] ?? null),
            'categoria' => $this->sanitizeString($data[15] ?? null),
            'inst_legal_categoria' => $this->sanitizeString($data[16] ?? null),
            'radio' => $this->sanitizeString($data[17] ?? null),
            'inst_legal_radio' => $this->sanitizeString($data[18] ?? null),
            'inst_legal_categoria_bis' => $this->sanitizeString($data[19] ?? null),
            'inst_legal_creacion' => $this->sanitizeString($data[20] ?? null),
            'letra_zona' => $this->sanitizeString($data[21] ?? null),
            'zona_departamento' => $this->sanitizeString($data[22] ?? null),
            'te_voip' => $this->sanitizeString($data[23] ?? null),
            'ambito' => $this->sanitizeString($data[24] ?? 'PUBLICO') ?: 'PUBLICO',
            'validado' => $this->sanitizeString($data[25] ?? null),
        ];
    }

    private function normalizeCoordinate(?string $coord): ?float
    {
        if (empty($coord)) {
            return null;
        }

        // Reemplazar coma por punto
        $normalized = str_replace(',', '.', $coord);

        return (float) $normalized;
    }
}
