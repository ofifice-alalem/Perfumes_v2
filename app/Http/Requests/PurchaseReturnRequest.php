<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'settlements'                        => 'nullable|array',
            'settlements.*.payment_method_id'    => 'required_with:settlements.*.amount|integer|exists:payment_methods,id',
            'settlements.*.amount'               => 'required_with:settlements.*.payment_method_id|numeric|min:0.01',
            'settlements.*.notes'                => 'nullable|string|max:500',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $items = $this->input('items', []);

            // قاعدة 10: لا يمكن إرجاع أكثر من المخزون المتاح
            // تجميع الكميات لكل منتج في حالة تكرار نفس المنتج في أسطر متعددة
            $quantityByProduct = [];
            foreach ($items as $item) {
                $productId = (int) ($item['product_id'] ?? 0);
                $quantity  = (float) ($item['quantity'] ?? 0);
                if ($productId > 0) {
                    $quantityByProduct[$productId] = ($quantityByProduct[$productId] ?? 0) + $quantity;
                }
            }

            foreach ($quantityByProduct as $productId => $totalQty) {
                $product = Product::find($productId);
                if (!$product) continue;

                if ($totalQty > (float) $product->stock) {
                    $v->errors()->add(
                        'items',
                        "الكمية المطلوبة للمنتج [{$product->name}] ({$totalQty}) تتجاوز المخزون المتاح ({$product->stock})."
                    );
                }
            }
        });
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
