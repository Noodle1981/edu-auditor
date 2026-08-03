<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditoriaRadioResultado extends Model
{
    use HasFactory;

    protected $table = 'auditoria_radio_resultados';

    protected $fillable = [
        'nomina_id',
        'sector',
        'zona_sueldo',
        'zona_sige',
        'coincide_zona',
        'nivel_educativo',
        'nombre_establecimiento',
        'cue',
        'localidad',
        'radio_sueldo',
        'radio_sige',
        'radio_circ',
        'radio_camino',
        'radio_justificado',
        'inst_legal_radio',
        'porc_pagado_mediana',
        'escala_usada',
        'total_filas_docentes',
        'estado_auditoria',
        'estado_gestion',
        'notas_auditor',
    ];

    protected $casts = [
        'coincide_zona' => 'boolean',
        'radio_justificado' => 'boolean',
        'porc_pagado_mediana' => 'float',
    ];

    public function nomina()
    {
        return $this->belongsTo(NominaSueldo::class, 'nomina_id');
    }
}
