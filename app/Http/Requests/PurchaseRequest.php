<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'supplier_id'          => 'required|integer|exists:suppliers,id',
            'notes'                => 'nullable|string|max:1000',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'required|integer|exists:products,id',
            'items.*.quantity'     => 'required|numeric|min:0.01',
            'items.*.line_total'   => 'required|numeric|min:0',
            // For cash supplier: payment must equal total
            'paid_amount'          => 'nullable|numeric|min:0',
            'payment_method_id'    => 'nullable|integer|exists:payment_methods,id',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required'        => 'المورد مطلوب',
            'items.required'              => 'يجب إضافة منتج واحد على الأقل',
            'items.*.product_id.required' => 'المنتج مطلوب',
            'items.*.quantity.min'        => 'الكمية يجب أن تكون أكبر من صفر',
            'items.*.line_total.min'      => 'الإجمالي يجب أن يكون أكبر من أو يساوي صفر',
        ];
    }
}
