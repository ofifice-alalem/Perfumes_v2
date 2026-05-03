<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\PaymentMethod;
use App\Repositories\Contracts\SupplierSettlementRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierSettlementController extends Controller
{
    public function __construct(private SupplierSettlementRepositoryInterface $settlements) {}

    public function index(Request $request): Response
    {
        return Inertia::render('SupplierSettlements/Index', [
            'settlements'    => $this->settlements->filter($request->only(
                'supplier_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max', 'page'
            )),
            'suppliers'      => Supplier::where('is_active', true)->where('id', '!=', 1)->orderBy('name')->get(['id', 'name', 'total_debt']),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters'        => $request->only('supplier_id', 'payment_method_id', 'date_from', 'date_to', 'amount_min', 'amount_max'),
        ]);
    }

    public function show(int $id): Response
    {
        return Inertia::render('SupplierSettlements/Show', [
            'settlement' => $this->settlements->findWithRelations($id),
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

        $this->settlements->createSettlement($data);

        if (!empty($data['redirect_purchase'])) {
            return redirect()->route('purchases.show', $data['redirect_purchase'])
                ->with('success', 'تم إنشاء التسوية بنجاح');
        }

        return back()->with('success', 'تم إنشاء التسوية بنجاح');
    }

    public function destroy(int $id)
    {
        $this->settlements->deleteSettlement($id);
        return back()->with('success', 'تم حذف التسوية');
    }
}
