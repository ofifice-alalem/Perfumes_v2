<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseReturnRequest;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
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
            'returns'        => $this->returns->paginated(30),
            'suppliers'      => $this->suppliers->forSelectList(),
            'products'       => Product::orderBy('name')->get(['id', 'name']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        $supplierId = request()->integer('supplier_id', 1);
        $isCash     = $supplierId === 1;

        if ($isCash) {
            $products = Product::orderBy('name')->get(['id', 'name', 'stock']);
        } else {
            // Only products purchased from this supplier
            $products = Product::whereHas('purchaseItems', function ($q) use ($supplierId) {
                $q->whereHas('purchase', fn($q) => $q->where('supplier_id', $supplierId));
            })
            ->orderBy('name')
            ->get(['id', 'name', 'stock']);
        }

        return Inertia::render('PurchaseReturns/Create', [
            'suppliers'        => $this->suppliers->forSelectList(),
            'products'         => $products,
            'paymentMethods'   => PaymentMethod::orderBy('name')->get(['id', 'name']),
            'selected_supplier_id' => $supplierId,
        ]);
    }

    public function store(PurchaseReturnRequest $request): RedirectResponse
    {
        $data   = $request->validated();
        $isCash = (int) $data['supplier_id'] === 1;

        $purchaseReturn = DB::transaction(function () use ($data, $isCash) {
            $purchaseReturn = PurchaseReturn::create([
                'supplier_id'      => $data['supplier_id'],
                'purchase_id'      => $data['purchase_id'] ?? null,
                'notes'            => $data['notes'] ?? null,
                'total'            => 0,
                'recovered_amount' => 0,
                'due_recovery'     => 0,
                'recovery_status'  => 'unpaid',
            ]);

            // Create return items (observers update stock + return.total)
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

            // Create settlements (recoveries) — same pattern as purchase payments
            $settlements = $data['settlements'] ?? [];

            // Cash supplier with no explicit settlements → auto full recovery
            if ($isCash && empty($settlements) && $purchaseReturn->total > 0) {
                $defaultMethod = PaymentMethod::first();
                if ($defaultMethod) {
                    $settlements = [[
                        'payment_method_id' => $defaultMethod->id,
                        'amount'            => $purchaseReturn->total,
                        'notes'             => 'استرداد تلقائي — مورد نقدي',
                    ]];
                }
            }

            foreach ($settlements as $settlement) {
                $amount = (float) $settlement['amount'];
                if ($amount <= 0) continue;

                SupplierSettlement::create([
                    'supplier_id'       => $purchaseReturn->supplier_id,
                    'purchase_id'       => $purchaseReturn->purchase_id,
                    'purchase_return_id' => $purchaseReturn->id,
                    'payment_method_id' => $settlement['payment_method_id'],
                    'amount'            => $amount,
                    'notes'             => $settlement['notes'] ?? null,
                    'created_at'        => now(),
                ]);
            }

            return $purchaseReturn;
        });

        return redirect()->route('purchase-returns.show', $purchaseReturn->id)
            ->with('success', 'تم تسجيل المرتجع بنجاح');
    }

    public function show(int $id): Response
    {
        return Inertia::render('PurchaseReturns/Show', [
            'return'         => $this->returns->findWithRelations($id),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function destroy(int $id): RedirectResponse
    {
        $purchaseReturn      = $this->returns->findWithRelations($id);
        $deleteSettlements   = request()->boolean('delete_settlements', false);

        DB::transaction(function () use ($purchaseReturn, $deleteSettlements) {
            // 1. Restore stock manually — do NOT delete items (they stay as historical record)
            foreach ($purchaseReturn->items as $item) {
                Product::where('id', $item->product_id)
                    ->increment('stock', $item->quantity);
            }

            // 2. Handle linked settlements
            if ($deleteSettlements) {
                SupplierSettlement::where('purchase_return_id', $purchaseReturn->id)->delete();
            } else {
                SupplierSettlement::where('purchase_return_id', $purchaseReturn->id)
                    ->update(['purchase_return_id' => null]);
            }

            // 3. Soft delete the return itself
            $purchaseReturn->delete();

            // 4. Recalculate supplier totals
            if ($purchaseReturn->supplier_id && $purchaseReturn->supplier_id !== 1) {
                PurchaseItemObserver::recalculateSupplier($purchaseReturn->supplier_id);
            }
        });

        return redirect()->route('purchase-returns.index')
            ->with('success', 'تم إلغاء المرتجع بنجاح');
    }

    public function restore(int $id): RedirectResponse
    {
        $purchaseReturn = PurchaseReturn::withTrashed()->findOrFail($id);

        DB::transaction(function () use ($purchaseReturn) {
            // 1. Restore return
            $purchaseReturn->restore();

            // 2. Restore linked settlements
            SupplierSettlement::withTrashed()
                ->where('purchase_return_id', $purchaseReturn->id)
                ->restore();

            // 3. Re-deduct stock for all return items (items were never deleted)
            foreach ($purchaseReturn->items as $item) {
                Product::where('id', $item->product_id)
                    ->decrement('stock', $item->quantity);
            }

            // 4. Recalculate supplier totals
            if ($purchaseReturn->supplier_id && $purchaseReturn->supplier_id !== 1) {
                PurchaseItemObserver::recalculateSupplier($purchaseReturn->supplier_id);
            }
        });

        return redirect()->route('purchase-returns.show', $id)
            ->with('success', 'تم استعادة المرتجع بنجاح');
    }
}
