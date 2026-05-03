<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\PaymentMethod;
use App\Repositories\Contracts\SupplierPaymentRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPaymentController extends Controller
{
    public function __construct(private SupplierPaymentRepositoryInterface $payments) {}

    public function index(Request $request): Response
    {
        return Inertia::render('SupplierPayments/Index', [
            'payments'       => $this->payments->filter($request->only(
                'supplier_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max', 'page'
            )),
            'suppliers'      => Supplier::where('is_active', true)->where('id', '!=', 1)->orderBy('name')->get(['id', 'name', 'total_debt']),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters'        => $request->only('supplier_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max'),
        ]);
    }

    public function show(int $id): Response
    {
        return Inertia::render('SupplierPayments/Show', [
            'payment' => $this->payments->findWithRelations($id),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id'       => 'required|exists:suppliers,id',
            'purchase_id'       => 'nullable|exists:purchases,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string',
            'redirect_purchase' => 'nullable|integer',
        ]);

        $this->payments->createPayment($data);

        if (!empty($data['redirect_purchase'])) {
            return redirect()->route('purchases.show', $data['redirect_purchase'])
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
