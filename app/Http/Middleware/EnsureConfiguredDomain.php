<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureConfiguredDomain
{
    /**
     * توجيه جميع الطلبات الواردة عبر 127.0.0.1 أو localhost تلقائياً إلى النطاق المخصص في الإعدادات
     */
    public function handle(Request $request, Closure $next): Response
    {
        $appUrl = config('app.url');

        if (empty($appUrl) || str_contains($appUrl, 'localhost') || str_contains($appUrl, '127.0.0.1')) {
            return $next($request);
        }

        // استثناء مسارات الإعداد الأولي والطباعة الحرارية المباشرة
        if ($request->is('setup*') || $request->is('api/printer*')) {
            return $next($request);
        }

        $targetHost = parse_url($appUrl, PHP_URL_HOST);
        $currentHost = $request->getHost();

        // إذا كان الطلب قادماً عبر 127.0.0.1 أو localhost بينما تم تحديد دومين مخصص
        if ($targetHost && ($currentHost === '127.0.0.1' || $currentHost === 'localhost')) {
            $scheme = parse_url($appUrl, PHP_URL_SCHEME) ?: 'https';
            $port = parse_url($appUrl, PHP_URL_PORT);
            $portSuffix = ($port && !in_array($port, [80, 443])) ? ':' . $port : '';
            $targetUrl = "{$scheme}://{$targetHost}{$portSuffix}" . $request->getRequestUri();

            return redirect()->to($targetUrl, 302);
        }

        return $next($request);
    }
}

