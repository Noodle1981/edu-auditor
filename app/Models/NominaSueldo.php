<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NominaSueldo extends Model
{
    use HasFactory;

    protected $table = 'nominas_sueldos';

    protected $fillable = [
        'periodo',
        'archivo_nombre',
        'total_filas',
        'total_sectores',
        'fecha_importacion',
    ];

    public function resultados()
    {
        return $this->hasMany(AuditoriaRadioResultado::class, 'nomina_id');
    }

    public function registrosViejos()
    {
        return $this->hasMany(AuditoriaSueldoRegistroViejo::class, 'nomina_id');
    }
}
