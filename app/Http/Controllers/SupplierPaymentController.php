<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierPaymentRequest;
use App\Models\PaymentMethod;
use App\Models\SupplierPayment;
use App\Repositories\Contracts\PaymentMethodRepositoryInterface;
use App\Repositories\Contracts\SupplierPaymentRepositoryInterface;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPaymentController extends Controller
{
    public function __construct(
        private SupplierPaymentRepositoryInterface $payments,
        private SupplierRepositoryInterface $suppliers,
        private PaymentMethodRepositoryInterface $paymentMethods,
    ) {}

    public function index(): Response
    {
        return Inertia::render('SupplierPayments/Index', [
            'payments'       => $this->payments->paginated(30),
            'suppliers'      => $this->suppliers->forSelectList(),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
            'products'       => \App\Models\Product::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(int $id): Response
    {
        $payment = \App\Models\SupplierPayment::withTrashed()->with(['supplier', 'purchase', 'paymentMethod'])->findOrFail($id);

        return Inertia::render('SupplierPayments/Show', [
            'payment' => $payment,
        ]);
    }

    public function store(SupplierPaymentRequest $request): RedirectResponse
    {
        $data = $request->validated();

        SupplierPayment::create([
            'supplier_id'       => $data['supplier_id'],
            'user_id'           => auth()->id(),
            'purchase_id'       => $data['purchase_id'] ?? null,
            'payment_method_id' => $data['payment_method_id'],
            'amount'            => $data['amount'],
            'notes'             => $data['notes'] ?? null,
            'created_at'        => now(),
        ]);

        $redirectTo = ($data['purchase_id'] ?? null)
            ? redirect()->route('purchases.show', $data['purchase_id'])
            : back();

        return $redirectTo->with('success', 'تم تسجيل الدفعة بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $payment = $this->payments->find($id);
        $purchaseId = $payment->purchase_id;

        $payment->delete();

        return ($purchaseId ? redirect()->route('purchases.show', $purchaseId) : back())
            ->with('success', 'تم حذف الدفعة بنجاح');
    }

    public function restore(int $id): RedirectResponse
    {
        $payment = \App\Models\SupplierPayment::withTrashed()->findOrFail($id);
        $purchaseId = $payment->purchase_id;

        $payment->restore();

        return ($purchaseId ? redirect()->route('purchases.show', $purchaseId) : back())
            ->with('success', 'تم استعادة الدفعة بنجاح');
    }
}
