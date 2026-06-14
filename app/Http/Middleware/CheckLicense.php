<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\LicenseService;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class CheckLicense
{
    public function __construct(private LicenseService $licenseService) {}

    public function handle(Request $request, Closure $next): Response
    {
        // استثناء مسارات التفعيل من التحقق حتى لا يحدث إعادة توجيه لا نهائية
        if ($request->is('license*')) {
            return $next($request);
        }

        // التحقق من الرخصة وتخزين النتيجة في الذاكرة المؤقتة (Cache) لمدة 24 ساعة
        // هذا يمنع البطء الناتج عن قراءة اللوحة الأم مع كل طلب
        $isLicensed = Cache::remember('is_system_licensed', 86400, function () {
            return $this->licenseService->isLicensed();
        });

        if (!$isLicensed) {
            Cache::forget('is_system_licensed'); // مسح الذاكرة إذا كانت غير مرخصة

            // إذا كان الطلب من نوع API أو Inertia XHR
            if ($request->wantsJson() || $request->header('X-Inertia')) {
                // Return a 409 Conflict to force Inertia to show the license page
                return inertia()->location(route('license.index'));
            }
            
            return redirect()->route('license.index');
        }

        return $next($request);
    }
}
