<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseReturnRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'supplier_id'                        => 'required|integer|exists:suppliers,id',
            'purchase_id'                        => 'nullable|integer|exists:purchases,id',
            'notes'                              => 'nullable|string|max:1000',
            'items'                              => 'required|array|min:1',
            'items.*.product_id'                 => 'required|integer|exists:products,id',
            'items.*.quantity'                   => 'required|numeric|min:0.01',
            'items.*.line_total'                 => 'required|numeric|min:0',
            // Multiple settlements (recoveries)
            'settlements'                        => 'nullable|array',
            'settlements.*.payment_method_id'    => 'required_with:settlements.*.amount|integer|exists:payment_methods,id',
            'settlements.*.amount'               => 'required_with:settlements.*.payment_method_id|numeric|min:0.01',
            'settlements.*.notes'                => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required'        => 'المورد مطلوب',
            'items.required'              => 'يجب إضافة منتج واحد على الأقل',
            'items.*.product_id.required' => 'المنتج مطلوب',
            'items.*.quantity.min'        => 'الكمية يجب أن تكون أكبر من صفر',
        ];
    }
}
