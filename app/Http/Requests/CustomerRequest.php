<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $customerId = $this->route('customer');

        return [
            'name'      => 'required|string|max:255',
            'phone'     => 'required|string|max:20|unique:customers,phone,' . ($customerId ?? 'NULL'),
            'email'     => 'nullable|email|max:255|unique:customers,email,' . ($customerId ?? 'NULL'),
            'address'   => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'  => 'اسم العميل مطلوب',
            'phone.required' => 'رقم الهاتف مطلوب',
            'phone.unique'   => 'رقم الهاتف مستخدم مسبقاً',
            'email.unique'   => 'البريد الإلكتروني مستخدم مسبقاً',
        ];
    }
}
