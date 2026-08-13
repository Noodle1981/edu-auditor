<?php

namespace App\Actions;

use App\Models\Edificio;
use App\Models\Establecimiento;
use App\Models\Modalidad;
use Illuminate\Support\Facades\DB;

class StoreModalidadAction
{
    /**
     * Execute the action to store a new school structure.
     */
    public function execute(array $data): Modalidad
    {
        return DB::transaction(function () use ($data) {
            // 1. Edificio
            $edificio = Edificio::firstOrCreate(
                ['cui' => $data['cui']],
                [
                    'calle' => $data['calle'],
                    'localidad' => $data['localidad'],
                    'zona_departamento' => $data['zona_departamento'],
                    'latitud' => $data['latitud'] ?? null,
                    'longitud' => $data['longitud'] ?? null,
                ]
            );

            // 2. Establecimiento
            $cabeceraCue = $edificio->cabecera_cue ?? $data['cue'];

            $establecimiento = Establecimiento::where('cue', $data['cue'])->first();

            if ($establecimiento) {
                $establecimiento->update([
                    'edificio_id' => $edificio->id,
                    'nombre' => $data['nombre_establecimiento'],
                    'establecimiento_cabecera' => $data['establecimiento_cabecera'],
                    'cue_edificio_principal' => $establecimiento->cue_edificio_principal ?? $cabeceraCue,
                ]);
            } else {
                $establecimiento = Establecimiento::create([
                    'cue' => $data['cue'],
                    'edificio_id' => $edificio->id,
                    'nombre' => $data['nombre_establecimiento'],
                    'establecimiento_cabecera' => $data['establecimiento_cabecera'],
                    'cue_edificio_principal' => $cabeceraCue,
                ]);
            }

            // 3. Modalidad
            return Modalidad::create([
                'establecimiento_id' => $establecimiento->id,
                'direccion_area' => $data['direccion_area'],
                'nivel_educativo' => $data['nivel_educativo'],
                'sector' => $data['sector'] ?? null,
                'radio' => $data['radio'] ?? null,
                'radio_sige' => $data['radio_sige'] ?? $data['radio'] ?? null,
                'zona' => $data['zona'] ?? null,
                'ambito' => $data['ambito'],
                'validado' => false,
            ]);
        });
    }
}
