<?php

namespace App\Http\Requests;

use App\Models\Supplier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SupplierSettlementRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'supplier_id'        => 'required|integer|exists:suppliers,id',
            'purchase_id'        => 'nullable|integer|exists:purchases,id',
            'purchase_return_id' => 'nullable|integer|exists:purchase_returns,id',
            'payment_method_id'  => 'required|integer|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string|max:500',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $supplierId = $this->input('supplier_id');
            if (!$supplierId) return;

            $supplier = Supplier::find($supplierId);
            if (!$supplier) return;

            // قاعدة 19: لا يمكن إنشاء تسوية إذا كان total_debt > 0
            if ((float) $supplier->total_debt > 0) {
                $v->errors()->add('supplier_id', 'لا يمكن إنشاء تسوية والمورد لا يزال مديناً (' . number_format($supplier->total_debt, 2) . '). استخدم الدفعة بدلاً.');
            }
        });
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
