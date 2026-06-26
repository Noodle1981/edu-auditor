<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreModalidadRequest extends FormRequest
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
            'nombre_establecimiento' => 'required|string',
            'cue' => ['required', 'regex:/^(\d{9}|PROV.*)$/'],
            'cui' => ['required', 'regex:/^(\d{7}|PROV.*)$/'],
            'establecimiento_cabecera' => ['required', 'regex:/^(\d{9}|PROV.*)$/'],
            'nivel_educativo' => 'required',
            'direccion_area' => 'required',
            'ambito' => 'required',
            'sector' => 'nullable',
            'radio' => 'nullable',
            'zona' => 'nullable',
            'calle' => 'required',
            'localidad' => 'required',
            'zona_departamento' => 'required',
            'latitud' => 'nullable|numeric',
            'longitud' => 'nullable|numeric',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation()
    {
        $this->merge([
            'latitud' => $this->latitud ?? null,
            'longitud' => $this->longitud ?? null,
        ]);
    }
}
