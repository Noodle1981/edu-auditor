<?php

namespace App\Actions;

use App\Models\Edificio;
use App\Models\Modalidad;
use Illuminate\Support\Facades\DB;

class UpdateModalidadAction
{
    /**
     * Execute the action to update school structure.
     */
    public function execute(Modalidad $modalidad, array $data): void
    {
        DB::transaction(function () use ($modalidad, $data) {
            // Sync Edificio
            $edificio = $modalidad->establecimiento->edificio;
            if ($edificio->cui !== $data['cui']) {
                $targetEdificio = Edificio::where('cui', $data['cui'])->first();
                if ($targetEdificio) {
                    $modalidad->establecimiento->update(['edificio_id' => $targetEdificio->id]);
                    $edificio = $targetEdificio;
                } else {
                    $edificio->update(['cui' => $data['cui']]);
                }
            }

            // Sync building letra_zona
            $edificio->update([
                'letra_zona' => $data['letra_zona'] ?? null,
            ]);

            // Sync Establecimiento
            $modalidad->establecimiento->update([
                'cue' => $data['cue'],
                'nombre' => $data['nombre_establecimiento'],
                'observaciones' => $data['observaciones'] ?? null,
            ]);

            // Sync Modalidad
            $modalidad->update([
                'nivel_educativo' => $data['nivel_educativo'],
                'direccion_area' => $data['direccion_area'],
                'validado' => $data['validado'],
                'radio' => $data['radio'] ?? null,
                'sector' => $data['sector'] ?? null,
                'ambito' => $data['ambito'],
                'categoria' => $data['categoria'] ?? null,
            ]);

            app(\App\Services\ActivityLogService::class)->logUpdate(
                $modalidad, 
                "Actualizó modalidad", 
                ['after' => $data]
            );
        });
    }
}
