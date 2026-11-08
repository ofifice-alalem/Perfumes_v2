<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الفترة المحاسبية مطلوب',
            'name.max'      => 'اسم الفترة المحاسبية لا يمكن أن يتجاوز 255 حرفاً',
        ];
    }
}
