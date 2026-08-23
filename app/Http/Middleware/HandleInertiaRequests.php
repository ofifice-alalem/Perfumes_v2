<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
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
        ];
    }
}
