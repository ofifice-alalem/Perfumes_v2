<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId   = $this->route('user');
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        return [
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . ($userId ?? 'NULL'),
            'email'    => 'nullable|email|max:255|unique:users,email,' . ($userId ?? 'NULL'),
            'password' => $isUpdate ? 'nullable|string|min:6' : 'required|string|min:6',
            'role'     => 'required|string|in:super-admin,admin,saler,cashier',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'     => 'الاسم مطلوب',
            'username.required' => 'اسم الدخول مطلوب',
            'username.unique'   => 'اسم الدخول مستخدم مسبقاً',
            'email.unique'      => 'البريد الإلكتروني مستخدم مسبقاً',
            'password.required' => 'كلمة المرور مطلوبة',
            'password.min'      => 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        ];
    }
}
