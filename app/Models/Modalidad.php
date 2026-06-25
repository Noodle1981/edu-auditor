<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Modalidad extends Model
{
    use SoftDeletes;

    protected $table = 'modalidades';

    protected $fillable = [
        'establecimiento_id', 'direccion_area', 'nivel_educativo', 'sector', 'categoria',
        'inst_legal_categoria', 'radio', 'inst_legal_radio', 'inst_legal_categoria_bis',
        'inst_legal_creacion', 'ambito', 'validado', 'estado_validacion', 'validado_por_user_id',
        'validado_en', 'zona', 'observaciones', 'campos_auditados', 'radio_sige'
    ];

    public function establecimiento(): BelongsTo
    {
        return $this->belongsTo(Establecimiento::class, 'establecimiento_id');
    }
}
