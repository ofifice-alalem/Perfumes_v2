<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id'                    => 'nullable|exists:customers,id',
            'customer_type'                  => 'nullable|in:regular,vip',
            'notes'                          => 'nullable|string',
            'items'                          => 'required|array|min:1',
            'items.*.product_id'             => 'required|exists:products,id',
            'items.*.size_id'                => 'nullable|exists:sizes,id',
            'items.*.sale_type'              => 'required|in:tier_decant,unit_decant,full_bottle,unit_based',
            'items.*.quantity'               => 'required|numeric|min:0.01',
            'items.*.unit_price'             => 'nullable|numeric|min:0',
            'items.*.line_total'             => 'nullable|numeric|min:0',
            'payments'                       => 'nullable|array',
            'payments.*.payment_method_id'   => 'required|exists:payment_methods,id',
            'payments.*.amount'              => 'required|numeric|min:0.01',
            'payments.*.notes'               => 'nullable|string',
            'debt_payment'                   => 'nullable|array',
            'debt_payment.payment_method_id' => 'required_with:debt_payment|exists:payment_methods,id',
            'debt_payment.amount'            => 'required_with:debt_payment|numeric|min:0.01',
        ];
    }

    public function getCustomerId(): int
    {
        $customerId = $this->input('customer_id');
        return ($customerId && $customerId !== 'null') ? (int)$customerId : 1;
    }
}
