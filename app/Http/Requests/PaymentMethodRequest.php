<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentMethodRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('payment_method');

        return [
            'name'      => 'required|string|max:50|unique:payment_methods,name,' . ($id ?? 'NULL'),
            'is_active' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم وسيلة الدفع مطلوب',
            'name.unique'   => 'وسيلة الدفع هذه موجودة مسبقاً',
            'name.max'      => 'الاسم يجب أن لا يتجاوز 50 حرفاً',
        ];
    }
}
