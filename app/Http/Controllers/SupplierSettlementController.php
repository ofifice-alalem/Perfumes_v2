<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierSettlementRequest;
use App\Models\PaymentMethod;
use App\Models\SupplierSettlement;
use App\Repositories\Contracts\PaymentMethodRepositoryInterface;
use App\Repositories\Contracts\SupplierSettlementRepositoryInterface;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SupplierSettlementController extends Controller
{
    public function __construct(
        private SupplierSettlementRepositoryInterface $settlements,
        private SupplierRepositoryInterface $suppliers,
        private PaymentMethodRepositoryInterface $paymentMethods,
    ) {}

    public function index(): Response
    {
        return Inertia::render('SupplierSettlements/Index', [
            'settlements'    => $this->settlements->paginated(30),
            'suppliers'      => $this->suppliers->forSelectList(),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(int $id): Response
    {
        $settlement = \App\Models\SupplierSettlement::with(['supplier', 'purchase', 'purchaseReturn', 'paymentMethod'])->findOrFail($id);

        return Inertia::render('SupplierSettlements/Show', [
            'settlement' => $settlement,
        ]);
    }

    public function store(SupplierSettlementRequest $request): RedirectResponse
    {
        $data = $request->validated();

        SupplierSettlement::create([
            'supplier_id'        => $data['supplier_id'],
            'user_id'            => auth()->id(),
            'purchase_id'        => $data['purchase_id'] ?? null,
            'purchase_return_id' => $data['purchase_return_id'] ?? null,
            'payment_method_id'  => $data['payment_method_id'],
            'amount'             => $data['amount'],
            'notes'              => $data['notes'] ?? null,
            'created_at'         => now(),
        ]);

        $redirectTo = $data['purchase_return_id']
            ? redirect()->route('purchase-returns.show', $data['purchase_return_id'])
            : ($data['purchase_id']
                ? redirect()->route('purchases.show', $data['purchase_id'])
                : back());

        return $redirectTo->with('success', 'تم تسجيل التسوية بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $settlement = $this->settlements->find($id);
        $purchaseId = $settlement->purchase_id;

        $settlement->delete();

        return ($purchaseId ? redirect()->route('purchases.show', $purchaseId) : back())
            ->with('success', 'تم حذف التسوية بنجاح');
    }
}
