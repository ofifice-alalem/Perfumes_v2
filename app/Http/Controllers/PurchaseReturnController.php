<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseReturnRequest;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\Supplier;
use App\Models\SupplierSettlement;
use App\Observers\PurchaseItemObserver;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Repositories\Contracts\PurchaseReturnRepositoryInterface;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseReturnController extends Controller
{
    public function __construct(
        private PurchaseReturnRepositoryInterface $returns,
        private PurchaseRepositoryInterface $purchases,
        private SupplierRepositoryInterface $suppliers,
    ) {}

    public function index(): Response
    {
        return Inertia::render('PurchaseReturns/Index', [
            'returns'   => $this->returns->paginated(20),
            'suppliers' => $this->suppliers->forSelectList(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('PurchaseReturns/Create', [
            'suppliers'      => $this->suppliers->forSelectList(),
            'products'       => Product::orderBy('name')->get(['id', 'name', 'stock']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(PurchaseReturnRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $isCash = (int) $data['supplier_id'] === 1;

        $purchaseReturn = DB::transaction(function () use ($data, $isCash) {
            $purchaseReturn = PurchaseReturn::create([
                'supplier_id' => $data['supplier_id'],
                'purchase_id' => $data['purchase_id'] ?? null,
                'notes'       => $data['notes'] ?? null,
                'total'       => 0,
            ]);

            foreach ($data['items'] as $item) {
                $lineTotal = (float) $item['line_total'];
                $quantity  = (float) $item['quantity'];
                $unitCost  = $quantity > 0 ? $lineTotal / $quantity : 0;

                PurchaseReturnItem::create([
                    'purchase_return_id' => $purchaseReturn->id,
                    'product_id'         => $item['product_id'],
                    'quantity'           => $quantity,
                    'unit_cost'          => $unitCost,
                    'line_total'         => $lineTotal,
                    'created_at'         => now(),
                ]);
            }

            $purchaseReturn->refresh();

            // Auto-settlement for cash supplier
            if ($isCash && $purchaseReturn->total > 0) {
                $settlement = SupplierSettlement::create([
                    'supplier_id'       => $purchaseReturn->supplier_id,
                    'purchase_id'       => $purchaseReturn->purchase_id,
                    'payment_method_id' => $data['payment_method_id'] ?? PaymentMethod::first()->id,
                    'amount'            => $purchaseReturn->total,
                    'notes'             => 'تسوية تلقائية — مرتجع مورد نقدي',
                    'created_at'        => now(),
                ]);
                $purchaseReturn->update(['settlement_id' => $settlement->id]);
            }

            // For regular supplier: create settlement if requested and total_debt <= 0
            if (!$isCash && !empty($data['create_settlement']) && !empty($data['payment_method_id'])) {
                $supplier = Supplier::find($data['supplier_id']);
                // Recalculate after return items were saved
                PurchaseItemObserver::recalculateSupplier($data['supplier_id']);
                $supplier->refresh();

                if ((float) $supplier->total_debt <= 0 && $purchaseReturn->total > 0) {
                    $settlement = SupplierSettlement::create([
                        'supplier_id'       => $purchaseReturn->supplier_id,
                        'purchase_id'       => $purchaseReturn->purchase_id,
                        'payment_method_id' => $data['payment_method_id'],
                        'amount'            => $purchaseReturn->total,
                        'notes'             => 'تسوية مرتجع — ' . ($data['notes'] ?? ''),
                        'created_at'        => now(),
                    ]);
                    $purchaseReturn->update(['settlement_id' => $settlement->id]);
                }
            }

            return $purchaseReturn;
        });

        return redirect()->route('purchase-returns.show', $purchaseReturn->id)
            ->with('success', 'تم تسجيل المرتجع بنجاح');
    }

    public function show(int $id): Response
    {
        return Inertia::render('PurchaseReturns/Show', [
            'return' => $this->returns->findWithRelations($id),
        ]);
    }

    public function destroy(int $id): RedirectResponse
    {
        $purchaseReturn = $this->returns->findWithRelations($id);

        DB::transaction(function () use ($purchaseReturn) {
            // 1. Restore stock for all return items (observer fires on delete)
            foreach ($purchaseReturn->items as $item) {
                $item->delete();
            }

            // 2. Soft delete linked settlement if exists
            if ($purchaseReturn->settlement_id) {
                \App\Models\SupplierSettlement::where('id', $purchaseReturn->settlement_id)->delete();
            }

            // 3. Soft delete the return itself
            $purchaseReturn->delete();

            // 4. Recalculate supplier totals
            if ($purchaseReturn->supplier_id && $purchaseReturn->supplier_id !== 1) {
                PurchaseItemObserver::recalculateSupplier($purchaseReturn->supplier_id);
            }
        });

        return redirect()->route('purchase-returns.index')->with('success', 'تم إلغاء المرتجع بنجاح');
    }

    public function restore(int $id): RedirectResponse
    {
        $purchaseReturn = \App\Models\PurchaseReturn::withTrashed()->findOrFail($id);

        DB::transaction(function () use ($purchaseReturn) {
            // 1. Restore return
            $purchaseReturn->restore();

            // 2. Restore linked settlement
            if ($purchaseReturn->settlement_id) {
                \App\Models\SupplierSettlement::withTrashed()->where('id', $purchaseReturn->settlement_id)->restore();
            }

            // 3. Re-deduct stock for all return items
            foreach ($purchaseReturn->items as $item) {
                \App\Models\Product::where('id', $item->product_id)->decrement('stock', $item->quantity);
            }

            // 4. Recalculate supplier totals
            if ($purchaseReturn->supplier_id && $purchaseReturn->supplier_id !== 1) {
                PurchaseItemObserver::recalculateSupplier($purchaseReturn->supplier_id);
            }
        });

        return redirect()->route('purchase-returns.show', $id)->with('success', 'تم استعادة المرتجع بنجاح');
    }
}
