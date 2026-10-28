<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && is_string($this->name)) {
            $this->merge([
                'name' => trim(preg_replace('/\s+/u', ' ', $this->name)),
            ]);
        }
    }

    public function rules(): array
    {
        $productId = $this->route('product') ?? $this->route('id') ?? $this->id;
        if ($productId instanceof Product) {
            $productId = $productId->id;
        }

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'name')->ignore($productId),
            ],
            'qrcode'                 => 'nullable|string|max:100',
            'category_id'            => 'required|exists:categories,id',
            'selling_type'           => 'required|in:tier_based,unit_priced',
            'price_tier_id'          => 'required_if:selling_type,tier_based|nullable|exists:price_tiers,id',
            'min_stock'              => 'nullable|numeric|min:0',
            'price_per_unit_regular' => 'nullable|numeric|min:0',
            'price_per_unit_vip'     => 'nullable|numeric|min:0',
            'full_bottle_regular'    => 'nullable|numeric|min:0',
            'full_bottle_vip'        => 'nullable|numeric|min:0',
            'bottle_volume'          => 'nullable|numeric|min:0.01',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $data = $this->validated();

            if (isset($data['price_per_unit_vip'], $data['price_per_unit_regular'])) {
                if ($data['price_per_unit_vip'] > $data['price_per_unit_regular']) {
                    $v->errors()->add('price_per_unit_vip', 'سعر VIP يجب أن يكون أقل من أو يساوي السعر العادي');
                }
            }

            if (isset($data['full_bottle_vip'], $data['full_bottle_regular'])) {
                if ($data['full_bottle_vip'] > $data['full_bottle_regular']) {
                    $v->errors()->add('full_bottle_vip', 'سعر VIP للعبوة يجب أن يكون أقل من أو يساوي السعر العادي');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'name.required'              => 'اسم المنتج مطلوب',
            'name.unique'                => 'اسم المنتج موجود مسبقاً في المنظومة، يرجى اختيار اسم مختلف أو تعديل الصنف القائم',
            'category_id.required'       => 'التصنيف مطلوب',
            'category_id.exists'         => 'التصنيف غير موجود',
            'selling_type.required'      => 'نوع البيع مطلوب',
            'price_tier_id.required_if'  => 'التير مطلوب للعطور الزيتية',
        ];
    }
}

