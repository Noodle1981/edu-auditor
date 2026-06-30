<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Modalidad extends Model
{
    use SoftDeletes;

    protected $table = 'modalidades';

    protected $fillable = [
        'establecimiento_id', 'direccion_area', 'nivel_educativo', 'sector', 'categoria',
        'inst_legal_categoria', 'radio', 'inst_legal_radio', 'radio_justificado', 'inst_legal_categoria_bis',
        'inst_legal_creacion', 'ambito', 'validado', 'estado_validacion', 'validado_por_user_id',
        'validado_en', 'zona', 'observaciones', 'campos_auditados', 'radio_sige', 'radio_observado',
    ];

    public function establecimiento(): BelongsTo
    {
        return $this->belongsTo(Establecimiento::class, 'establecimiento_id');
    }

    /**
     * Update the validation status, observations, and auditing user.
     */
    public function cambiarEstado(string $estado, ?string $observaciones = null, ?int $userId = null): void
    {
        $this->update([
            'estado_validacion' => $estado,
            'observaciones' => $observaciones,
            'validado_por_user_id' => $userId,
            'validado' => ($estado === 'VALIDADO'),
            'validado_en' => ($estado === 'VALIDADO' ? now() : null),
        ]);
    }
}
