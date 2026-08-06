<?php

namespace App\Actions;

use App\Models\Edificio;
use App\Models\Establecimiento;
use App\Services\ActivityLogService;

class StoreEdificioAction
{
    protected $activityLogger;

    public function __construct(ActivityLogService $activityLogger)
    {
        $this->activityLogger = $activityLogger;
    }

    public function execute(array $data): Edificio
    {
        $cueCabecera = $data['cue_cabecera'] ?? null;
        unset($data['cue_cabecera']);

        $edificio = Edificio::create($data);

        if (! empty($cueCabecera)) {
            $cabecera = Establecimiento::where('cue', $cueCabecera)->first();
            if ($cabecera) {
                $cabecera->update([
                    'edificio_id' => $edificio->id,
                    'cue_edificio_principal' => $cabecera->cue,
                ]);
            }
        }

        $this->activityLogger->logUpdate($edificio, 'Creación de Edificio', [
            'after' => $data,
        ]);

        return $edificio;
    }
}
