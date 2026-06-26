<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInstrumentosRequest extends FormRequest
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
            'inst_legal_radio' => 'nullable|string|max:255',
            'inst_legal_categoria' => 'nullable|string|max:255',
            'inst_legal_creacion' => 'nullable|string|max:255',
        ];
    }
}
