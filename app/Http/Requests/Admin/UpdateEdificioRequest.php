<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEdificioRequest extends FormRequest
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
            'cui'              => 'required|string|max:50|unique:edificios,cui,' . $this->route('id'),
            'calle'            => 'required|string|max:255',
            'numero_puerta'    => 'nullable|string|max:20',
            'codigo_postal'    => 'nullable|numeric',
            'localidad'        => 'required|string|max:255',
            'latitud'          => 'nullable|numeric',
            'longitud'         => 'nullable|numeric',
            'letra_zona'       => 'nullable|string|max:10',
            'zona_departamento'=> 'required|string|max:255',
            'orientacion'      => 'nullable|string|max:50',
            'te_voip'          => 'nullable|string|max:50',
            'cue_cabecera'     => 'nullable|exists:establecimientos,cue',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation()
    {
        $this->merge([
            'cui' => strtoupper(trim($this->cui)),
        ]);
    }
}
