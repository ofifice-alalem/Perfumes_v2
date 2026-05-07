<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WasteLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) {
                    $index = explode('.', $attribute)[1];
                    $productId = $this->input("items.{$index}.product_id");
                    
                    if ($productId) {
                        $product = \App\Models\Product::find($productId);
                        if ($product && $value > $product->stock) {
                            $fail("الكمية المطلوبة ({$value}) أكبر من المخزون المتاح ({$product->stock})");
                        }
                    }
                },
            ],
            'items.*.reason' => ['required', Rule::in(['broken', 'spilled', 'expired', 'lost', 'other'])],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'يجب إضافة منتج واحد على الأقل',
            'items.min' => 'يجب إضافة منتج واحد على الأقل',
            'items.*.product_id.required' => 'المنتج مطلوب',
            'items.*.product_id.exists' => 'المنتج المحدد غير موجود',
            'items.*.quantity.required' => 'الكمية مطلوبة',
            'items.*.quantity.numeric' => 'الكمية يجب أن تكون رقماً',
            'items.*.quantity.min' => 'الكمية يجب أن تكون أكبر من صفر',
            'items.*.reason.required' => 'سبب التلف مطلوب',
            'items.*.reason.in' => 'سبب التلف غير صحيح',
        ];
    }
}
