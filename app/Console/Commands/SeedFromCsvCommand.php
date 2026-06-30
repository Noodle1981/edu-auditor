<?php

namespace App\Console\Commands;

use App\Models\ImportLog;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

class SeedFromCsvCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:seed-from-csv 
                            {--type= : Type of import (status, agentes, licencias, all)}
                            {--file= : Custom file path for the import}
                            {--incremental : Perform incremental import without deleting existing records}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed database directly from consolidated local CSV files in the datos_csv/ directory';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $type = $this->option('type') ?: 'status';
        $customFile = $this->option('file');

        $baseDir = base_path('datos_csv');
        $agenteFile = $customFile ?: ($baseDir.'/agentes.csv');
        $licenciaFile = $customFile ?: ($baseDir.'/licencias.csv');

        if ($type === 'status') {
            $this->showStatus($agenteFile, $licenciaFile);

            return 0;
        }

        if ($type === 'agentes') {
            return $this->importAgentes($agenteFile);
        }

        if ($type === 'licencias') {
            return $this->importLicencias($licenciaFile);
        }

        if ($type === 'all') {
            $this->info('=== PASO 1: Importando Agentes y Designaciones ===');
            $res = $this->importAgentes($agenteFile);
            if ($res !== 0) {
                return $res;
            }

            $this->info("\n=== PASO 2: Importando Licencias Históricas Consolidadas ===");
            $res = $this->importLicencias($licenciaFile);
            if ($res !== 0) {
                return $res;
            }

            $this->info("\n🎉 ¡Proceso de importación unificada finalizado con éxito!");

            return 0;
        }

        $this->error('Tipo de importación inválido. Tipos permitidos: status, agentes, licencias, all');

        return 1;
    }

    /**
     * Show available files and database status.
     */
    private function showStatus($agenteFile, $licenciaFile)
    {
        $this->info('=== ESTADO DE ARCHIVOS LOCALES CONSOLIDADOS (datos_csv/) ===');

        $filesRows = [];

        // Agentes
        $agenteExists = file_exists($agenteFile);
        $agenteSize = $agenteExists ? round(filesize($agenteFile) / 1024 / 1024, 2).' MB' : 'N/A';
        $agenteDate = $agenteExists ? date('Y-m-d H:i:s', filemtime($agenteFile)) : 'N/A';
        $dbCargos = DB::table('agente_cargos')->count();
        $dbDesignaciones = DB::table('designaciones')->count();
        $statusDbAgente = ($dbCargos > 0) ? "✅ {$dbCargos} cargos / {$dbDesignaciones} desig" : '❌ Vacío';

        $filesRows[] = ['agentes.csv (Agentes y cargos)', $agenteExists ? '✅ SI' : '❌ NO', $agenteSize, $agenteDate, $statusDbAgente];

        // Licencias
        $licenciaExists = file_exists($licenciaFile);
        $licenciaSize = $licenciaExists ? round(filesize($licenciaFile) / 1024 / 1024, 2).' MB' : 'N/A';
        $licenciaDate = $licenciaExists ? date('Y-m-d H:i:s', filemtime($licenciaFile)) : 'N/A';
        $dbLicencias = DB::table('licencias')->count();
        $statusDbLicencia = $dbLicencias > 0 ? "✅ {$dbLicencias} licencias" : '❌ Vacío';

        $filesRows[] = ['licencias.csv (Licencias históricas)', $licenciaExists ? '✅ SI' : '❌ NO', $licenciaSize, $licenciaDate, $statusDbLicencia];

        $this->table(
            ['Archivo', 'Existe', 'Tamaño', 'Última Modificación', 'Estado en Base de Datos'],
            $filesRows
        );

        $totalAgentes = DB::table('agentes')->count();

        $this->line("\n=== ESTADO ACTUAL DE LA BASE DE DATOS ===");
        $this->line("• Total Agentes Únicos: {$totalAgentes}");
        $this->line("• Total Cargos Activos (agente_cargos): {$dbCargos}");
        $this->line("• Total Designaciones: {$dbDesignaciones}");
        $this->line("• Total Licencias: {$dbLicencias}");
        $this->line("\nUsa --type=agentes para importar el padrón unificado.");
        $this->line('Usa --type=licencias para importar todas las licencias.');
        $this->line('Usa --type=all para hacer la carga completa.');
    }

    /**
     * Import Agents and Designations.
     */
    private function importAgentes($file)
    {
        if (! file_exists($file)) {
            $this->error("Archivo no encontrado: {$file}");

            return 1;
        }

        // We assume year 2026 for active designations since they are the active ones in the dump
        $year = 2026;
        $this->info('Importando Agentes y Designaciones...');

        $log = ImportLog::create([
            'filename' => basename($file),
            'status' => 'running',
            'started_at' => Carbon::now(),
            'anio' => $year,
            'user_id' => null, // CLI
        ]);

        $scriptPath = base_path('crear_base_datos_importacion.py');
        $process = new Process(['python', $scriptPath, '--type', 'agentes_designaciones', '--file', $file, '--year', (string) $year]);
        $process->setTimeout(900); // 15 minutes timeout

        $process->run(function ($type, $buffer) {
            $this->output->write($buffer);
        });

        if ($process->isSuccessful()) {
            $countCargos = DB::table('agente_cargos')->where('anio', $year)->count();
            $countDesignaciones = DB::table('designaciones')->where('anio', $year)->count();

            $log->update([
                'status' => 'success',
                'completed_at' => Carbon::now(),
                'records_count' => $countCargos + $countDesignaciones,
                'error_message' => 'Importación de agentes y cargos completada desde agentes.csv',
            ]);

            $this->info("\n✅ Agentes importados correctamente. Cargos: {$countCargos}, Designaciones: {$countDesignaciones}");
            Cache::flush();

            return 0;
        } else {
            $error = $process->getErrorOutput() ?: $process->getOutput();
            $log->update([
                'status' => 'failed',
                'completed_at' => Carbon::now(),
                'error_message' => substr($error, 0, 1000),
            ]);
            $this->error("\n❌ Error ejecutando importación: ".$error);

            return 1;
        }
    }

    /**
     * Import historical licenses from single consolidated file.
     */
    private function importLicencias($file)
    {
        if (! file_exists($file)) {
            $this->error("Archivo no encontrado: {$file}");

            return 1;
        }

        $this->info("Importando Licencias Históricas desde {$file}...");

        $log = ImportLog::create([
            'filename' => basename($file),
            'status' => 'running',
            'started_at' => Carbon::now(),
            'anio' => null, // Multiple years
            'user_id' => null, // CLI
        ]);

        // Since the python import script processes a single year and deletes existing licenses of that year,
        // we can read our consolidated licencias.csv, and instead of modifying python to support multiple years at once,
        // we can temporatily split it into separate files or process it iteratively by year using python.
        // Even simpler: the python script receives the --year parameter to validate and clean.
        // We will call the Python script once for each year (2020 to 2026) using the same input file!
        // The python script will read the whole file but only import the rows matching the --year parameter.
        // Let's verify: Yes! crear_base_datos_importacion.py has:
        // "if start_year <= year and end_year >= year: overlap_count += 1"
        // And inside import_licencias: it deletes existing of that year and inserts row matching the year.
        // Wait, does it only insert the rows matching the year?
        // Let's check import_licencias in crear_base_datos_importacion.py:
        // "insert_data.append((id_tramite, ..., year))" -> Yes, it appends the selected year to the database insert!
        // But wait! Does it filter rows by that year?
        // Let's look at lines 525-535 in crear_base_datos_importacion.py:
        // "insert_data.append((id_tramite, ..., year))" -> It assigns "year" (args.year) to all rows it parses from the file!
        // Ah! It doesn't filter by dates inside the python script; it assumes the file only contains licenses of that year!
        // That means we must split the consolidated licencias.csv file by year in PHP and pass each temporary file to Python,
        // OR we can write a clean parser directly in PHP to import the CSV in bulk without calling Python!
        // Writing the parser in PHP is extremely fast, simple, and avoids having to split files and call python multiple times!
        // Let's write the licencias parser directly in PHP! It will be incredibly fast and run 100% locally.

        $this->info('Procesando archivo CSV en memoria...');

        $isIncremental = $this->option('incremental');

        // Open file
        if (($handle = fopen($file, 'r')) !== false) {
            // Read header
            $header = fgetcsv($handle, 10000, ',');

            // Check if this is a report with metadata at the beginning (e.g. licencias_ultimo.csv)
            if ($header && strpos(strtolower($header[0]), 'txtagente') === false) {
                // Keep reading lines until we find the real header
                while (($line = fgetcsv($handle, 10000, ',')) !== false) {
                    if ($line && strpos(strtolower($line[0]), 'txtagente') !== false) {
                        $header = $line;
                        break;
                    }
                }
            }

            if ($isIncremental) {
                $this->info('Modo INCREMENTAL activo: se conservarán los registros históricos.');
            } else {
                $this->info('Limpiando registros de licencias anteriores (2020-2026)...');
                DB::table('licencias')->whereBetween('anio', [2020, 2026])->delete();
            }

            $batchSize = 2000;
            $batchData = [];
            $agentesBatch = [];
            $insertedAgentes = [];
            $totalCount = 0;

            // Begin transaction
            DB::beginTransaction();

            try {
                while (($row = fgetcsv($handle, 10000, ',')) !== false) {
                    if (count($row) < 10) {
                        continue;
                    }

                    $nombreAgente = $row[0];
                    $dni = $row[1];
                    $genero = strtoupper($row[2]);
                    $tipoLicencia = $row[3];
                    $dias = (int) $row[4];

                    // Dates in format DD/MM/YYYY
                    $fechaInicio = $this->parseDate($row[5]);
                    $fechaFin = $this->parseDate($row[6]);
                    $fechaCarga = $this->parseDateTime($row[7]);

                    $documentoRespaldo = $row[8];
                    $referenciaInterna = (int) $row[9];

                    // Extract year from start date
                    $year = $fechaInicio ? (int) date('Y', strtotime($fechaInicio)) : 2026;
                    if ($year < 2020 || $year > 2026) {
                        // Default to the year of the start date if valid, else skip or default
                        if ($year < 2000 || $year > 2100) {
                            $year = 2026;
                        }
                    }

                    // If incremental, check if license already exists
                    if ($isIncremental) {
                        $licExists = false;
                        if ($referenciaInterna > 0) {
                            $licExists = DB::table('licencias')->where('referencia_interna', $referenciaInterna)->exists();
                        } else {
                            $licExists = DB::table('licencias')
                                ->where('dni', $dni)
                                ->where('fecha_inicio', $fechaInicio)
                                ->where('fecha_fin', $fechaFin)
                                ->where('tipo_licencia', $tipoLicencia)
                                ->exists();
                        }
                        if ($licExists) {
                            continue; // Skip existing license
                        }
                    }

                    // Add agent to insert or ignore list if not seen yet
                    if ($dni && ! isset($insertedAgentes[$dni])) {
                        // Check if agent exists in DB to avoid SQL integrity constraint violations
                        $exists = DB::table('agentes')->where('dni', $dni)->exists();
                        if (! $exists) {
                            $agentesBatch[] = [
                                'dni' => $dni,
                                'nombre_agente' => $nombreAgente,
                                'genero' => $genero,
                                'legajo' => null,
                                'fecha_alta' => null,
                            ];
                            $insertedAgentes[$dni] = true;
                        }
                    }

                    $batchData[] = [
                        'id_tramite' => 0, // Default or parsed if available
                        'fecha_carga' => $fechaCarga,
                        'nombre_agente' => $nombreAgente,
                        'dni' => $dni,
                        'genero' => $genero,
                        'tipo_licencia' => $tipoLicencia,
                        'documento_respaldo' => $documentoRespaldo,
                        'fecha_inicio' => $fechaInicio,
                        'fecha_fin' => $fechaFin,
                        'dias' => $dias,
                        'referencia_interna' => $referenciaInterna,
                        'anio' => $year,
                    ];

                    $totalCount++;

                    // Insert in batches
                    if (count($batchData) >= $batchSize) {
                        if (count($agentesBatch) > 0) {
                            DB::table('agentes')->insertOrIgnore($agentesBatch);
                            $agentesBatch = [];
                        }
                        DB::table('licencias')->insert($batchData);
                        $batchData = [];

                        $this->output->write('.');
                    }
                }

                // Insert remaining rows
                if (count($agentesBatch) > 0) {
                    DB::table('agentes')->insertOrIgnore($agentesBatch);
                }
                if (count($batchData) > 0) {
                    DB::table('licencias')->insert($batchData);
                }

                DB::commit();
                fclose($handle);

                $log->update([
                    'status' => 'success',
                    'completed_at' => Carbon::now(),
                    'records_count' => $totalCount,
                    'error_message' => $isIncremental
                        ? 'Importación incremental de licencias completada desde '.basename($file)
                        : 'Importación de licencias completada desde '.basename($file),
                ]);

                $this->info("\n✅ Licencias importadas correctamente. Total registros insertados: {$totalCount}");
                Cache::flush();

                return 0;

            } catch (\Exception $e) {
                DB::rollBack();
                fclose($handle);

                $log->update([
                    'status' => 'failed',
                    'completed_at' => Carbon::now(),
                    'error_message' => substr($e->getMessage(), 0, 1000),
                ]);
                $this->error("\n❌ Error en la base de datos durante la importación: ".$e->getMessage());

                return 1;
            }
        } else {
            $this->error("No se pudo abrir el archivo: {$file}");

            return 1;
        }
    }

    /**
     * Helper to parse DD/MM/YYYY dates to YYYY-MM-DD
     */
    private function parseDate($dateStr)
    {
        if (empty($dateStr)) {
            return null;
        }
        try {
            $parts = explode('/', $dateStr);
            if (count($parts) === 3) {
                $day = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
                $month = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
                $year = $parts[2];

                return "{$year}-{$month}-{$day}";
            }

            return date('Y-m-d', strtotime($dateStr));
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Helper to parse date times to YYYY-MM-DD HH:MM:SS
     */
    private function parseDateTime($dateTimeStr)
    {
        if (empty($dateTimeStr)) {
            return null;
        }
        try {
            $parts = explode(' ', $dateTimeStr);
            $date = $this->parseDate($parts[0]);
            $time = isset($parts[1]) ? $parts[1] : '00:00:00';
            if ($date) {
                return "{$date} {$time}";
            }

            return null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
