<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SupplierSettlementRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'supplier_id'       => 'required|integer|exists:suppliers,id',
            'purchase_id'       => 'nullable|integer|exists:purchases,id',
            'payment_method_id' => 'required|integer|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required'       => 'المورد مطلوب',
            'payment_method_id.required' => 'وسيلة الدفع مطلوبة',
            'amount.required'            => 'المبلغ مطلوب',
            'amount.min'                 => 'المبلغ يجب أن يكون أكبر من صفر',
        ];
    }
}
