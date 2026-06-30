<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Designacion extends Model
{
    protected $table = 'designaciones';

    public $timestamps = false;

    protected $fillable = [
        'centro', 'establecimiento', 'escalafon', 'cupof', 'cue', 'cargo_horas',
        'horas_catedra', 'turno', 'plan_estudio', 'nombre_agente', 'dni', 'genero',
        'legajo', 'fecha_alta', 'situacion_revista', 'norma_legal', 'observaciones', 'control_id', 'anio',
    ];

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'dni', 'dni');
    }

    public function establecimientoInfo(): BelongsTo
    {
        return $this->belongsTo(Establecimiento::class, 'cue', 'cue');
    }
}
