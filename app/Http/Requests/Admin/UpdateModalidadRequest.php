<?php

namespace App\Http\Requests\Admin;

use App\Models\Modalidad;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateModalidadRequest extends FormRequest
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
        $modalidad = Modalidad::find($this->route('id'));
        $establecimientoId = $modalidad ? $modalidad->establecimiento_id : null;

        return [
            'cui' => ['required', 'regex:/^(\d{7}|PROV.*)$/'],
            'cue' => [
                'required',
                'regex:/^(\d{9}|PROV.*)$/',
                Rule::unique('establecimientos', 'cue')->ignore($establecimientoId),
            ],
            'nombre_establecimiento' => 'required|string',
            'nivel_educativo' => 'required',
            'direccion_area' => 'required',
            'validado' => 'boolean',
            'radio' => 'nullable',
            'sector' => 'nullable',
            'ambito' => 'required',
            'letra_zona' => 'nullable',
            'categoria' => 'nullable',
            'observaciones' => 'nullable|string',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'cue.unique' => 'El CUE ingresado ya está asignado a otro establecimiento.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation()
    {
        $this->merge([
            'cui' => strtoupper($this->cui),
        ]);
    }
}
