<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\PurchaseItem;
use App\Models\SupplierPayment;
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

            // Create purchase items (observers update stock + purchase.total)
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

            // Handle payments (multiple supported)
            $payments = $data['payments'] ?? [];

            if ($isCash && empty($payments)) {
                // Cash supplier with no explicit payments → auto full payment not possible without method
                // Just skip — frontend enforces at least one payment for cash
            }

            foreach ($payments as $payment) {
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
        $purchase = $this->purchases->findWithRelations($id);

        DB::transaction(function () use ($purchase) {
            foreach ($purchase->items as $item) {
                $item->delete();
            }
            $purchase->delete();
        });

        return redirect()->route('purchases.index')->with('success', 'تم حذف الفاتورة بنجاح');
    }
}
