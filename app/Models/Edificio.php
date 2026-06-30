<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class Edificio extends Model
{
    use SoftDeletes;

    protected $table = 'edificios';

    protected $fillable = [
        'cui', 'calle', 'numero_puerta', 'orientacion', 'codigo_postal',
        'localidad', 'latitud', 'longitud', 'letra_zona', 'zona_departamento', 'te_voip',
        'punto_partida', 'dist_circunf', 'radio_circ', 'distancia_camino', 'radio_camino', 'tiempo_google_auto', 'observacion',
    ];

    public function establecimientos(): HasMany
    {
        return $this->hasMany(Establecimiento::class, 'edificio_id');
    }

    public function cabecera(): HasOne
    {
        return $this->hasOne(Establecimiento::class, 'edificio_id')
            ->whereColumn('cue', 'cue_edificio_principal');
    }

    /**
     * Get the CUE of the cabecera establishment.
     */
    public function getCabeceraCueAttribute(): ?string
    {
        return $this->cabecera?->cue;
    }

    /**
     * Obtener mapa de nombres de edificios indexados por ID.
     */
    public static function getNamesMap(): Collection
    {
        $mapArray = Cache::remember('edificios_names_map_v2', 3600, function () {
            return self::with('cabecera')
                ->get()
                ->mapWithKeys(fn ($e) => [
                    $e->id => $e->cabecera?->nombre ?? 'Sin Nombre',
                ])
                ->toArray();
        });

        return collect($mapArray);
    }
}
