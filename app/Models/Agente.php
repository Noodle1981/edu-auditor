<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agente extends Model
{
    protected $table = 'agentes';

    public $timestamps = false;

    protected $primaryKey = 'dni';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'dni', 'nombre_agente', 'genero', 'legajo', 'fecha_alta',
    ];

    public function cargos(): HasMany
    {
        return $this->hasMany(AgenteCargo::class, 'dni', 'dni');
    }

    public function designaciones(): HasMany
    {
        return $this->hasMany(Designacion::class, 'dni', 'dni');
    }

    public function licencias(): HasMany
    {
        return $this->hasMany(Licencia::class, 'dni', 'dni');
    }
}
