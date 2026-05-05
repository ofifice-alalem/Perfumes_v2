<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentMethodRequest;
use App\Repositories\Contracts\PaymentMethodRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PaymentMethodController extends Controller
{
    public function __construct(private PaymentMethodRepositoryInterface $paymentMethods) {}

    public function index(): Response
    {
        return Inertia::render('PaymentMethods/Index', [
            'paymentMethods' => $this->paymentMethods->allOrdered(),
        ]);
    }

    public function store(PaymentMethodRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['is_active'] = $request->boolean('is_active', true);

        $this->paymentMethods->create($data);

        return back()->with('success', 'تم إضافة وسيلة الدفع بنجاح');
    }

    public function update(PaymentMethodRequest $request, int $id): RedirectResponse
    {
        $data = $request->validated();
        $data['is_active'] = $request->boolean('is_active', true);

        $this->paymentMethods->update($data, $id);

        return back()->with('success', 'تم تحديث وسيلة الدفع بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $method = $this->paymentMethods->find($id);

        if ($method->hasRelatedRecords()) {
            return back()->with('error', 'لا يمكن حذف وسيلة دفع مرتبطة بدفعات أو تسويات');
        }

        $this->paymentMethods->delete($id);

        return back()->with('success', 'تم حذف وسيلة الدفع بنجاح');
    }
}
