<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Repositories\Contracts\SettlementRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettlementController extends Controller
{
    public function __construct(private SettlementRepositoryInterface $settlements) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Settlements/Index', [
            'settlements'    => $this->settlements->filter($request->only(
                'customer_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max', 'page'
            )),
            'customers'      => Customer::where('is_active', true)->where('id', '!=', 1)->orderBy('name')->get(['id', 'name']),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters'        => $request->only('customer_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max'),
        ]);
    }

    public function show(int $id): Response
    {
        return Inertia::render('Settlements/Show', [
            'settlement' => $this->settlements->findWithRelations($id),
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
        ]);

        $this->settlements->createSettlement($data);

        return back()->with('success', 'تم إنشاء التسوية بنجاح');
    }

    public function destroy(int $id)
    {
        $this->settlements->deleteSettlement($id);
        return back()->with('success', 'تم حذف التسوية');
    }
}
