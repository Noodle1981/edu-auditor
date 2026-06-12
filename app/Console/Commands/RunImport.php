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
    protected $signature = 'app:run-import {type} {logId}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Executes a Python import script in the background and logs the result';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $type = $this->argument('type');
        $logId = $this->argument('logId');

        $log = ImportLog::find($logId);
        if (!$log) {
            $this->error("Import log not found: {$logId}");
            return 1;
        }

        $log->update([
            'status' => 'running',
            'started_at' => Carbon::now(),
        ]);

        $scriptMap = [
            'agentes' => 'crear_base_datos_agentes.py',
            'designaciones' => 'crear_base_datos_designaciones.py',
            'licencias' => 'crear_base_datos_licencias.py',
        ];

        $tableMap = [
            'agentes' => 'agentes',
            'designaciones' => 'designaciones',
            'licencias' => 'licencias',
        ];

        if (!isset($scriptMap[$type])) {
            $errorMsg = "Unknown import type: {$type}";
            $log->update([
                'status' => 'failed',
                'completed_at' => Carbon::now(),
                'error_message' => $errorMsg,
            ]);
            $this->error($errorMsg);
            return 1;
        }

        $scriptName = $scriptMap[$type];
        $tableName = $tableMap[$type];
        $scriptPath = base_path($scriptName);

        $this->info("Running python script: {$scriptName}");

        // Run Python process
        $process = new Process(['python', $scriptPath]);
        $process->setTimeout(300); // 5 minutes timeout
        $process->run();

        if ($process->isSuccessful()) {
            $output = $process->getOutput();
            $this->info($output);

            // Get records count
            $count = DB::table($tableName)->count();

            $log->update([
                'status' => 'success',
                'completed_at' => Carbon::now(),
                'records_count' => $count,
                'error_message' => $output,
            ]);

            \Illuminate\Support\Facades\Cache::forget('dashboard_stats');

            return 0;
        } else {
            $errorOutput = $process->getErrorOutput() ?: $process->getOutput();
            $this->error("Script failed: " . $errorOutput);

            $log->update([
                'status' => 'failed',
                'completed_at' => Carbon::now(),
                'error_message' => $errorOutput,
            ]);

            return 1;
        }
    }
}
