<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SupplierRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $supplierId = $this->route('supplier');

        return [
            'name'      => 'required|string|max:255',
            'phone'     => 'required|string|max:20|unique:suppliers,phone,' . ($supplierId ?? 'NULL'),
            'email'     => 'nullable|email|max:255|unique:suppliers,email,' . ($supplierId ?? 'NULL'),
            'address'   => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'  => 'اسم المورد مطلوب',
            'phone.required' => 'رقم الهاتف مطلوب',
            'phone.unique'   => 'رقم الهاتف مستخدم مسبقاً',
            'email.unique'   => 'البريد الإلكتروني مستخدم مسبقاً',
        ];
    }
}
