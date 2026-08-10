<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepuracionCentroSector extends Model
{
    use HasFactory;

    protected $table = 'depuracion_centros_sectores';

    protected $fillable = [
        'centro',
        'sector',
        'nom_centro',
        'nom_sector',
        'nivel',
        'gestion',
        'cantidad_liquidaciones',
        'estado_depuracion',
        'observaciones',
        'establecimiento_id',
        'modalidad_id',
    ];

    protected $casts = [
        'centro' => 'integer',
        'sector' => 'integer',
        'cantidad_liquidaciones' => 'integer',
        'establecimiento_id' => 'integer',
        'modalidad_id' => 'integer',
    ];

    // Scopes de filtrado para consultas limpias
    public function scopeCentrosSinUso($query)
    {
        return $query->where('estado_depuracion', 'CENTRO_SIN_USO');
    }

    public function scopeSectoresSinUso($query)
    {
        return $query->where('estado_depuracion', 'SECTOR_SIN_USO');
    }

    public function scopeSueldosNoCatalogados($query)
    {
        return $query->where('estado_depuracion', 'SUELDO_NO_CATALOGADO');
    }

    public function scopeBajaVolumetria($query)
    {
        return $query->where('estado_depuracion', 'BAJA_VOLUMETRÍA');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado_depuracion', 'ACTIVO');
    }
}
