<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RolloverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('super-admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'new_period_name' => 'required|string|max:100',
            'notes'           => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'new_period_name.required' => 'اسم الفترة الجديدة مطلوب',
            'new_period_name.max'      => 'اسم الفترة لا يتجاوز 100 حرف',
        ];
    }
}
