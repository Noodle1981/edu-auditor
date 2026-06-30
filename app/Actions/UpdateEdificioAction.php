<?php

namespace App\Actions;

use App\Models\Edificio;
use App\Models\Establecimiento;
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
        if (! empty($data['cue_cabecera'])) {
            $cabecera = Establecimiento::where('cue', $data['cue_cabecera'])->first();
            if ($cabecera) {
                $cabeceraAnterior = $edificio->cabecera_cue;

                // Actualizar todas las escuelas de este edificio con el nuevo CUE principal/cabecera
                $edificio->establecimientos()->update(['cue_edificio_principal' => $cabecera->cue]);

                $this->activityLogger->logUpdate($edificio, 'Actualización de Cabecera', [
                    'cabecera_anterior' => $cabeceraAnterior,
                    'cabecera_nueva' => $cabecera->cue,
                    'nombre_cabecera' => $cabecera->nombre,
                ]);
            }
        }

        // Eliminar cue_cabecera y cabecera_cue del array antes del fill (no son columnas de la tabla)
        unset($data['cue_cabecera']);
        unset($data['cabecera_cue']);

        $edificio->fill($data);

        if ($edificio->isDirty()) {
            $this->activityLogger->logUpdate($edificio, 'Actualización de Edificio', [
                'before' => array_intersect_key($edificio->getOriginal(), $edificio->getDirty()),
                'after' => $edificio->getDirty(),
            ]);
            $edificio->save();
        }
    }
}
