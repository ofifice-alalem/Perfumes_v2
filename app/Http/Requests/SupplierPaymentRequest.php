<?php

namespace App\Http\Requests;

use App\Models\Purchase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SupplierPaymentRequest extends FormRequest
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $purchaseId = $this->input('purchase_id');
            $amount     = (float) $this->input('amount', 0);

            if (!$purchaseId || $amount <= 0) return;

            $purchase = Purchase::find($purchaseId);
            if (!$purchase) return;

            // قاعدة 9: لا يمكن أن يتجاوز المدفوع قيمة due_amount الفاتورة
            if ($amount > (float) $purchase->due_amount + 0.01) {
                $v->errors()->add('amount', 'المبلغ يتجاوز المتبقي من الفاتورة (' . number_format($purchase->due_amount, 2) . ').');
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
