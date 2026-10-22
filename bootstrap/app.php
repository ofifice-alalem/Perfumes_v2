<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\CheckLicense::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        $middleware->alias([
            'role'       => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Spatie\Permission\Exceptions\UnauthorizedException $e, $request) {
            return redirect()->route('invoices.create');
        });

        // 1. معالجة انتهاء صلاحية رمز الأمان (CSRF Token Mismatch - HTTP 419)
        $exceptions->render(function (\Illuminate\Session\TokenMismatchException $e, $request) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->header('X-Inertia')) {
                return \Inertia\Inertia::location(route('login'));
            }

            return redirect()->route('login');
        });

        // 2. معالجة انتهاء صلاحية الجلسة عند عدم النشاط (Unauthenticated - HTTP 401)
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->header('X-Inertia')) {
                return \Inertia\Inertia::location(route('login'));
            }

            return redirect()->route('login');
        });
    })->create();
