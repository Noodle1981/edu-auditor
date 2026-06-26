<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAuditoriaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->isAdministrativo() || $this->user()->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'estado' => 'required|in:PENDIENTE,CORRECTO,CORREGIDO,REVISAR,BAJA',
            'observaciones' => 'nullable|string',
            'campos_auditados' => 'nullable|array',
            'campos_auditados.*' => 'string|in:Nombre,Dirección,Edificio,CUI,CUE,GPS,RADIO,SECTOR,MODALIDAD,CATEGORÍA',
            'propagar_al_edificio' => 'nullable|boolean',
        ];
    }
}
