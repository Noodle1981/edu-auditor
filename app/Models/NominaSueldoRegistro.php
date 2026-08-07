<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NominaSueldoRegistro extends Model
{
    protected $table = 'nomina_sueldo_registros';

    protected $fillable = [
        'nomina_id',
        'centro',
        'sector',
        'clase',
        'cuil',
        'apellido_nombre',
        'zona',
        'a01_basico',
        'a04_radio',
        'porcentaje_calculado',
        'radio_deducido',
    ];

    /**
     * Relación con la Nómina de Sueldos.
     */
    public function nomina(): BelongsTo
    {
        return $this->belongsTo(NominaSueldo::class, 'nomina_id');
    }
}
