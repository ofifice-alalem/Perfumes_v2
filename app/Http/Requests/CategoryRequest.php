<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $categoryId = $this->route('category') ?? $this->route('id');

        return [
            'name'           => 'required|string|max:255|unique:categories,name,' . ($categoryId ?? 'NULL') . ',id',
            'unit'           => 'required|in:ml,pcs,g',
            'is_operational' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم التصنيف مطلوب',
            'name.unique'   => 'اسم التصنيف مسجل مسبقاً',
            'unit.required' => 'وحدة القياس مطلوبة',
            'unit.in'       => 'وحدة القياس المحددة غير صالحة (ml, pcs, g)',
        ];
    }
}
