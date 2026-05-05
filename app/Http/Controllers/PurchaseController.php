<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\PurchaseItem;
use App\Models\SupplierPayment;
use App\Models\SupplierSettlement;
use App\Observers\PurchaseItemObserver;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function __construct(
        private PurchaseRepositoryInterface $purchases,
        private SupplierRepositoryInterface $suppliers,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Purchases/Index', [
            'purchases' => $this->purchases->paginated(20),
            'suppliers' => $this->suppliers->forSelectList(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Purchases/Create', [
            'suppliers'      => $this->suppliers->forSelectList(),
            'products'       => Product::orderBy('name')->get(['id', 'name', 'stock']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(PurchaseRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $purchase = DB::transaction(function () use ($data) {
            $isCash = (int) $data['supplier_id'] === 1;

            $purchase = $this->purchases->create([
                'supplier_id'    => $data['supplier_id'],
                'notes'          => $data['notes'] ?? null,
                'total'          => 0,
                'paid_amount'    => 0,
                'due_amount'     => 0,
                'payment_status' => 'unpaid',
            ]);

            foreach ($data['items'] as $item) {
                $lineTotal = (float) $item['line_total'];
                $quantity  = (float) $item['quantity'];
                $unitCost  = $quantity > 0 ? $lineTotal / $quantity : 0;

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id'  => $item['product_id'],
                    'quantity'    => $quantity,
                    'unit_cost'   => $unitCost,
                    'line_total'  => $lineTotal,
                    'created_at'  => now(),
                ]);
            }

            $purchase->refresh();

            foreach ($data['payments'] ?? [] as $payment) {
                $amount = (float) $payment['amount'];
                if ($amount <= 0) continue;

                SupplierPayment::create([
                    'supplier_id'       => $purchase->supplier_id,
                    'purchase_id'       => $purchase->id,
                    'payment_method_id' => $payment['payment_method_id'],
                    'amount'            => $amount,
                    'notes'             => $payment['notes'] ?? null,
                    'created_at'        => now(),
                ]);
            }

            return $purchase;
        });

        return redirect()->route('purchases.show', $purchase->id)
            ->with('success', 'تم إنشاء فاتورة الشراء بنجاح');
    }

    public function show(int $id): Response
    {
        return Inertia::render('Purchases/Show', [
            'purchase'       => $this->purchases->findWithRelations($id),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function edit(int $id): Response
    {
        return Inertia::render('Purchases/Edit', [
            'purchase' => $this->purchases->findWithRelations($id),
        ]);
    }

    public function update(PurchaseRequest $request, int $id): RedirectResponse
    {
        $this->purchases->update(['notes' => $request->validated()['notes'] ?? null], $id);

        return redirect()->route('purchases.show', $id)->with('success', 'تم تحديث الفاتورة بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $purchase          = $this->purchases->findWithRelations($id);
        $deletePayments    = request()->boolean('delete_payments', false);
        $deleteSettlements = request()->boolean('delete_settlements', false);

        DB::transaction(function () use ($purchase, $deletePayments, $deleteSettlements) {
            // 1. Restore stock manually — do NOT delete items (they stay as historical record)
            foreach ($purchase->items as $item) {
                \App\Models\Product::where('id', $item->product_id)
                    ->decrement('stock', $item->quantity);
            }

            // 2. Handle linked payments
            if ($deletePayments) {
                SupplierPayment::where('purchase_id', $purchase->id)->delete();
            } else {
                SupplierPayment::where('purchase_id', $purchase->id)
                    ->update(['purchase_id' => null]);
            }

            // 3. Handle linked settlements
            if ($deleteSettlements) {
                SupplierSettlement::where('purchase_id', $purchase->id)->delete();
            } else {
                SupplierSettlement::where('purchase_id', $purchase->id)
                    ->update(['purchase_id' => null]);
            }

            // 4. Soft delete the purchase
            $purchase->delete();

            // 5. Recalculate supplier totals
            if ($purchase->supplier_id && $purchase->supplier_id !== 1) {
                PurchaseItemObserver::recalculateSupplier($purchase->supplier_id);
            }
        });

        return redirect()->route('purchases.index')->with('success', 'تم إلغاء الفاتورة بنجاح');
    }

    public function restore(int $id): RedirectResponse
    {
        $purchase = \App\Models\Purchase::withTrashed()->findOrFail($id);

        DB::transaction(function () use ($purchase) {
            // 1. Restore purchase
            $purchase->restore();

            // 2. Restore linked payments
            SupplierPayment::withTrashed()->where('purchase_id', $purchase->id)->restore();

            // 3. Restore linked settlements
            SupplierSettlement::withTrashed()->where('purchase_id', $purchase->id)->restore();

            // 4. Re-add stock for all items (items were never deleted)
            foreach ($purchase->items as $item) {
                \App\Models\Product::where('id', $item->product_id)
                    ->increment('stock', $item->quantity);
            }

            // 5. Recalculate supplier totals
            if ($purchase->supplier_id && $purchase->supplier_id !== 1) {
                PurchaseItemObserver::recalculateSupplier($purchase->supplier_id);
            }
        });

        return redirect()->route('purchases.show', $id)->with('success', 'تم استعادة الفاتورة بنجاح');
    }
}
