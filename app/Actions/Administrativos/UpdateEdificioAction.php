<?php

namespace App\Actions;

use App\Models\Edificio;
use App\Services\ActivityLogService;

class UpdateEdificioAction
{
    protected ActivityLogService $activityLogger;

    public function __construct(ActivityLogService $activityLogger)
    {
        $this->activityLogger = $activityLogger;
    }

    public function execute(Edificio $edificio, array $data): void
    {
        // Actualizar cabecera_cue del edificio si se envió un nuevo CUE cabecera
        if (!empty($data['cue_cabecera'])) {
            $cabecera = \App\Models\Establecimiento::where('cue', $data['cue_cabecera'])->first();
            if ($cabecera) {
                $data['cabecera_cue'] = $cabecera->cue;

                $this->activityLogger->logUpdate($edificio, 'Actualización de Cabecera', [
                    'cabecera_anterior' => $edificio->cabecera_cue,
                    'cabecera_nueva'    => $cabecera->cue,
                    'nombre_cabecera'   => $cabecera->nombre,
                ]);
            }
        }

        // Eliminar cue_cabecera del array antes del fill (no es columna del modelo)
        unset($data['cue_cabecera']);

        $edificio->fill($data);

        if ($edificio->isDirty()) {
            $this->activityLogger->logUpdate($edificio, 'Actualización de Edificio', [
                'before' => array_intersect_key($edificio->getOriginal(), $edificio->getDirty()),
                'after'  => $edificio->getDirty(),
            ]);
            $edificio->save();
        }
    }
}
