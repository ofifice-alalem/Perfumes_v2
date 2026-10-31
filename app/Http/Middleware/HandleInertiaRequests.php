<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return null;
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'flash' => [
                'success'            => session('success'),
                'error'              => session('error'),
                'created_invoice_id' => session('created_invoice_id'),
                'updated_stocks'     => session('updated_stocks'),
            ],
            'auth' => [
                'user' => $user ? [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'roles' => $user->roles->pluck('name'),
                ] : null,
            ],
            'globalPaymentMethods' => \Illuminate\Support\Facades\Cache::remember(
                'global_payment_methods_list',
                3600,
                fn() => \App\Models\PaymentMethod::orderBy('name')->get(['id', 'name'])->toArray()
            ),
            'storeBranding' => (function() {
                try {
                    return [
                        'name' => \App\Models\Setting::get('store_name', env('APP_NAME', 'منظومة السحابة')),
                        'logo' => \App\Models\Setting::get('store_logo'),
                    ];
                } catch (\Throwable $e) {
                    return [
                        'name' => env('APP_NAME', 'منظومة السحابة'),
                        'logo' => null,
                    ];
                }
            })(),
        ];
    }
}
