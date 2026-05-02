<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(private PaymentRepositoryInterface $payments) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Payments/Index', [
            'payments'       => $this->payments->filter($request->only(
                'customer_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max', 'page'
            )),
            'customers'      => Customer::where('is_active', true)->where('id', '!=', 1)->orderBy('name')->get(['id', 'name', 'total_debt']),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters'        => $request->only('customer_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max'),
        ]);
    }

    public function show(int $id): Response
    {
        return Inertia::render('Payments/Show', [
            'payment' => $this->payments->findWithRelations($id),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id'       => 'required|exists:customers,id',
            'invoice_id'        => 'nullable|exists:invoices,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string',
            'redirect_invoice'  => 'nullable|integer',
        ]);

        $this->payments->createPayment($data);

        if (!empty($data['redirect_invoice'])) {
            return redirect()->route('invoices.show', $data['redirect_invoice'])
                ->with('success', 'تم تسجيل الدفعة بنجاح');
        }

        return back()->with('success', 'تم تسجيل الدفعة بنجاح');
    }

    public function destroy(int $id)
    {
        $this->payments->deletePayment($id);
        return back()->with('success', 'تم حذف الدفعة');
    }
}
