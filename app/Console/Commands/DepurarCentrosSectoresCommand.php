<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class DepurarCentrosSectoresCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'auditoria:depurar-centros';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecuta el cruce y auditoría de depuración entre el Maestro de Centros/Sectores y la Liquidación de Sueldos.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando proceso de depuración de centros y sectores...');

        $scriptPath = base_path('scripts/auditar_centros_sectores.py');
        if (!file_exists($scriptPath)) {
            $this->error("No se encuentra el script de auditoría en: {$scriptPath}");
            return 1;
        }

        $process = new Process(['python', $scriptPath]);
        $process->setTimeout(300);

        $process->run(function ($type, $buffer) {
            $this->output->write($buffer);
        });

        if (!$process->isSuccessful()) {
            $this->error('Error al ejecutar la auditoría de depuración.');
            return 1;
        }

        $this->info('Auditoría y depuración completada con éxito.');
        return 0;
    }
}
