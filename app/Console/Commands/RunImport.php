<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\ImportLog;
use Symfony\Component\Process\Process;
use Carbon\Carbon;

class RunImport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:run-import {type} {logId} {filePath} {year}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Executes the Python import script for a specific file, type, and year';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $type = $this->argument('type');
        $logId = $this->argument('logId');
        $filePath = $this->argument('filePath');
        $year = $this->argument('year');

        $log = ImportLog::find($logId);
        if (!$log) {
            $this->error("Import log not found: {$logId}");
            return 1;
        }

        $log->update([
            'status' => 'running',
            'started_at' => Carbon::now(),
        ]);

        if (!file_exists($filePath)) {
            $errorMsg = "File not found at: {$filePath}";
            $log->update([
                'status' => 'failed',
                'completed_at' => Carbon::now(),
                'error_message' => $errorMsg,
            ]);
            $this->error($errorMsg);
            return 1;
        }

        $tableMap = [
            'agentes' => 'agente_cargos', // count cargos of this year
            'designaciones' => 'designaciones',
            'agentes_designaciones' => 'agente_cargos',
            'licencias' => 'licencias',
        ];

        $tableName = $tableMap[$type] ?? null;
        $scriptPath = base_path('crear_base_datos_importacion.py');

        $this->info("Running unified python script for type: {$type}, year: {$year}");

        // Run Python process
        $process = new Process(['python', $scriptPath, '--type', $type, '--file', $filePath, '--year', $year]);
        $process->setTimeout(300); // 5 minutes timeout
        $process->run();

        if ($process->isSuccessful()) {
            $output = $process->getOutput();
            $this->info($output);

            // Get records count for this year
            $count = 0;
            if ($tableName) {
                $count = DB::table($tableName)->where('anio', $year)->count();
            }

            $log->update([
                'status' => 'success',
                'completed_at' => Carbon::now(),
                'records_count' => $count,
                'error_message' => $this->cleanUtf8($output),
            ]);

            \Illuminate\Support\Facades\Cache::forget('dashboard_stats_' . $year);

            return 0;
        } else {
            $errorOutput = $process->getErrorOutput() ?: $process->getOutput();
            $this->error("Script failed: " . $errorOutput);

            $log->update([
                'status' => 'failed',
                'completed_at' => Carbon::now(),
                'error_message' => $this->cleanUtf8($errorOutput),
            ]);

            return 1;
        }
    }

    /**
     * Sanitizes process output to ensure it is valid UTF-8.
     */
    private function cleanUtf8($string)
    {
        if (empty($string)) {
            return $string;
        }

        if (mb_check_encoding($string, 'UTF-8')) {
            return $string;
        }

        $converted = @mb_convert_encoding($string, 'UTF-8', 'Windows-1252');
        if (mb_check_encoding($converted, 'UTF-8')) {
            return $converted;
        }

        return iconv('UTF-8', 'UTF-8//IGNORE', $string);
    }
}
