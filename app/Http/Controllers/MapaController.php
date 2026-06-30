<?php

namespace App\Http\Controllers;

use App\Models\Edificio;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MapaController extends Controller
{
    /**
     * Display the school map.
     */
    public function index(Request $request): Response
    {
        $result = collect();

        $edificios = Edificio::select(
            'id', 'cui', 'latitud', 'longitud', 'localidad', 'calle', 'numero_puerta',
            'zona_departamento', 'punto_partida', 'dist_circunf', 'radio_circ',
            'distancia_camino', 'radio_camino', 'tiempo_google_auto', 'observacion'
        )
            ->whereNotNull('latitud')
            ->whereNotNull('longitud')
            ->whereHas('establecimientos.modalidades')
            ->with([
                'establecimientos:id,edificio_id,cue,nombre',
                'establecimientos.modalidades:id,establecimiento_id,ambito,radio,radio_sige,categoria,nivel_educativo,direccion_area,sector',
            ])
            ->get();

        foreach ($edificios as $edificio) {
            $esPrivado = false;
            $mappedEstablecimientos = [];

            foreach ($edificio->establecimientos as $est) {
                $mappedModalidades = [];
                foreach ($est->modalidades as $mod) {
                    $esPriv = stripos($mod->ambito, 'privado') !== false || $mod->sector == 2;
                    if ($esPriv) {
                        $esPrivado = true;
                    }
                    $mappedModalidades[] = [
                        'id' => $mod->id,
                        'nivel' => $mod->nivel_educativo,
                        'area' => $mod->direccion_area,
                        'radio' => $mod->radio ?? 'N/A',
                        'radio_sige' => $mod->radio_sige ?? 'N/A',
                        'categoria' => $mod->categoria ?? 'N/A',
                        'ambito' => $esPriv ? 'PRIVADO' : 'PUBLICO',
                    ];
                }

                if (! empty($mappedModalidades)) {
                    $mappedEstablecimientos[] = [
                        'nombre' => $est->nombre,
                        'cue' => $est->cue,
                        'modalidades' => $mappedModalidades,
                    ];
                }
            }

            if (! empty($mappedEstablecimientos)) {
                $result->push([
                    'id' => $edificio->id,
                    'cui' => $edificio->cui,
                    'latitud' => (float) $edificio->latitud,
                    'longitud' => (float) $edificio->longitud,
                    'localidad' => $edificio->localidad ?? 'Sin localidad',
                    'calle' => $edificio->calle ?? 'Sin dirección',
                    'numero_puerta' => $edificio->numero_puerta ?? 'S/N',
                    'zona_departamento' => $edificio->zona_departamento ?? '',
                    'ambito' => $esPrivado ? 'PRIVADO' : 'PUBLICO',
                    'establecimientos' => $mappedEstablecimientos,
                    'punto_partida' => $edificio->punto_partida,
                    'dist_circunf' => $edificio->dist_circunf,
                    'radio_circ' => $edificio->radio_circ,
                    'distancia_camino' => $edificio->distancia_camino,
                    'radio_camino' => $edificio->radio_camino,
                    'tiempo_google_auto' => $edificio->tiempo_google_auto,
                    'observacion' => $edificio->observacion,
                ]);
            }
        }

        $edificiosArray = $result->toArray();

        return Inertia::render('Mapa', [
            'edificios' => $edificiosArray,
        ]);
    }
}
