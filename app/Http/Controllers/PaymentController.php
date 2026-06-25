<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(private PaymentRepositoryInterface $payments) {}

    public function index(): Response
    {
        return Inertia::render('Payments/Index', [
            'payments'       => $this->payments->paginated(30),
            'customers'      => Customer::withoutCash()->orderBy('name')->get(['id', 'name', 'total_debt', 'is_active']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
            'products'       => Product::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(int $id): Response
    {
        $payment = Payment::with(['customer', 'invoice', 'paymentMethod', 'user'])->findOrFail($id);

        return Inertia::render('Payments/Show', [
            'payment' => $payment,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'customer_id'       => 'required|exists:customers,id',
            'invoice_id'        => 'nullable|exists:invoices,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string',
        ]);

        Payment::create([
            'customer_id'       => $data['customer_id'],
            'user_id'           => auth()->id(),
            'invoice_id'        => $data['invoice_id'] ?? null,
            'payment_method_id' => $data['payment_method_id'],
            'amount'            => $data['amount'],
            'notes'             => $data['notes'] ?? null,
            'created_at'        => now(),
        ]);

        $redirectTo = $data['invoice_id']
            ? redirect()->route('invoices.show', $data['invoice_id'])
            : back();

        return $redirectTo->with('success', 'تم تسجيل الدفعة بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $payment   = Payment::findOrFail($id);
        $invoiceId = $payment->invoice_id;
        $payment->delete();

        return ($invoiceId ? redirect()->route('invoices.show', $invoiceId) : back())
            ->with('success', 'تم حذف الدفعة بنجاح');
    }

    public function restore(int $id): RedirectResponse
    {
        Payment::withTrashed()->findOrFail($id)->restore();
        return back()->with('success', 'تم استعادة الدفعة بنجاح');
    }
}
