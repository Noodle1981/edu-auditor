<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditoriaSueldoRegistroViejo extends Model
{
    use HasFactory;

    protected $table = 'auditoria_sueldo_registros_viejos';

    protected $fillable = [
        'nomina_id',
        'centro',
        'sector',
        'zona',
        'a01_basico',
        'a04_radio',
        'porcentaje_pagado',
        'escala_detectada',
        'clasificacion_auditor',
        'resolucion_aval',
        'notas_auditor',
    ];

    public function nomina()
    {
        return $this->belongsTo(NominaSueldo::class, 'nomina_id');
    }
}
