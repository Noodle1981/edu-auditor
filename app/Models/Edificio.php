<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Edificio extends Model
{
    use SoftDeletes;

    protected $table = 'edificios';

    protected $fillable = [
        'cui', 'calle', 'numero_puerta', 'orientacion', 'codigo_postal',
        'localidad', 'latitud', 'longitud', 'letra_zona', 'zona_departamento', 'te_voip',
        'punto_partida', 'dist_circunf', 'radio_circ', 'distancia_camino', 'radio_camino', 'tiempo_google_auto', 'observacion'
    ];

    public function establecimientos(): HasMany
    {
        return $this->hasMany(Establecimiento::class, 'edificio_id');
    }

    public function cabecera(): BelongsTo
    {
        return $this->belongsTo(Establecimiento::class, 'cabecera_cue', 'cue');
    }

    /**
     * Obtener mapa de nombres de edificios indexados por ID.
     */
    public static function getNamesMap(): \Illuminate\Support\Collection
    {
        return \Illuminate\Support\Facades\Cache::remember('edificios_names_map', 3600, function () {
            return self::with('cabecera')
                ->get()
                ->mapWithKeys(fn($e) => [
                    $e->id => $e->cabecera?->nombre ?? 'Sin Nombre',
                ]);
        });
    }
}
