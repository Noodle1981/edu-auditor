<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Establecimiento extends Model
{
    use SoftDeletes;

    protected $table = 'establecimientos';

    protected $fillable = [
        'edificio_id', 'cue', 'cue_edificio_principal', 'nombre', 'establecimiento_cabecera'
    ];

    public function edificio(): BelongsTo
    {
        return $this->belongsTo(Edificio::class, 'edificio_id');
    }

    public function modalidades(): HasMany
    {
        return $this->hasMany(Modalidad::class, 'establecimiento_id');
    }

    public function agentes(): HasMany
    {
        return $this->hasMany(Agente::class, 'cue', 'cue');
    }
}
