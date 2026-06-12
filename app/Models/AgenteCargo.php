<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgenteCargo extends Model
{
    public $timestamps = false;

    protected $table = 'agente_cargos';

    protected $fillable = [
        'dni', 'centro', 'establecimiento', 'escalafon', 'cupof', 'cue',
        'cargo_horas', 'horas_catedra', 'turno', 'plan_estudio',
        'situacion_revista', 'norma_legal', 'observaciones', 'control_id'
    ];

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'dni', 'dni');
    }
}
