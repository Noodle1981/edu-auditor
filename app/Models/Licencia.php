<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Licencia extends Model
{
    protected $table = 'licencias';

    public $timestamps = false;

    protected $fillable = [
        'id_tramite', 'fecha_carga', 'nombre_agente', 'dni', 'genero',
        'tipo_licencia', 'documento_respaldo', 'fecha_inicio', 'fecha_fin',
        'dias', 'referencia_interna', 'anio',
    ];

    public function agente(): BelongsTo
    {
        return $this->belongsTo(Agente::class, 'dni', 'dni');
    }
}
