<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Edificio extends Model
{
    use SoftDeletes;

    protected $table = 'edificios';

    protected $fillable = [
        'cui', 'calle', 'numero_puerta', 'orientacion', 'codigo_postal',
        'localidad', 'latitud', 'longitud', 'letra_zona', 'zona_departamento', 'te_voip'
    ];

    public function establecimientos(): HasMany
    {
        return $this->hasMany(Establecimiento::class, 'edificio_id');
    }
}
