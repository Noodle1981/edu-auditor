<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

use Illuminate\Support\Facades\Cache;

class Establecimiento extends Model
{
    use SoftDeletes;

    protected $table = 'establecimientos';

    protected $fillable = [
        'edificio_id', 'cue', 'cue_edificio_principal', 'nombre', 'establecimiento_cabecera',
    ];

    protected static function booted(): void
    {
        static::saved(function () {
            Cache::forget('edificios_names_map_v2');
            Cache::forget('edificios_options_react');
        });

        static::deleted(function () {
            Cache::forget('edificios_names_map_v2');
            Cache::forget('edificios_options_react');
        });
    }

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

    public function cabecera(): BelongsTo
    {
        return $this->belongsTo(Establecimiento::class, 'establecimiento_cabecera', 'cue');
    }
}
