<?php

namespace App\Http\Middleware;

use App\Http\Controllers\SetupWizardController;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSetupNotCompleted
{
    /**
     * التحقق من أن معالج الإعداد لم يكتمل مسبقاً، وإغلاق المسار في حال اكتماله
     */
    public function handle(Request $request, Closure $next): Response
    {
        // إذا كان المستخدم super-admin مسجل دخوله، يسمح له بإعادة فحص أو تعديل الإعدادات
        if ($request->user() && $request->user()->hasRole('super-admin')) {
            return $next($request);
        }

        // فحص حالة اكتمال التثبيت
        if (SetupWizardController::isSetupCompleted()) {
            if ($request->expectsJson() || $request->isMethod('POST')) {
                return response()->json([
                    'success' => false,
                    'message' => 'تم إعداد وتثبيت النظام مسبقاً، لا يمكن إعادة التهيئة.',
                ], 403);
            }

            return redirect()->route('login')->with('info', 'تم إعداد وتثبيت النظام مسبقاً.');
        }

        return $next($request);
    }
}
