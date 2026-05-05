<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest;
use App\Http\Requests\SupplierPaymentRequest;
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

        DB::transaction(function () use ($data) {
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

            // For cash supplier: record immediate full payment
            if ($isCash && !empty($data['paid_amount']) && (float) $data['paid_amount'] > 0) {
                $purchase->refresh();
                SupplierPayment::create([
                    'supplier_id'       => $purchase->supplier_id,
                    'purchase_id'       => $purchase->id,
                    'payment_method_id' => $data['payment_method_id'],
                    'amount'            => $purchase->total,
                    'notes'             => 'دفع فوري — مورد نقدي',
                    'created_at'        => now(),
                ]);
            }
        });

        return redirect()->route('purchases.index')->with('success', 'تم إنشاء فاتورة الشراء بنجاح');
    }

    public function show(int $id): Response
    {
        $purchase       = $this->purchases->findWithRelations($id);
        $paymentMethods = PaymentMethod::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Purchases/Show', [
            'purchase'       => $purchase,
            'paymentMethods' => $paymentMethods,
        ]);
    }

    public function edit(int $id): Response
    {
        $purchase = $this->purchases->findWithRelations($id);

        return Inertia::render('Purchases/Edit', [
            'purchase' => $purchase,
        ]);
    }

    public function update(PurchaseRequest $request, int $id): RedirectResponse
    {
        $purchase = $this->purchases->find($id);

        $this->purchases->update(['notes' => $request->validated()['notes'] ?? null], $id);

        return redirect()->route('purchases.show', $id)->with('success', 'تم تحديث الفاتورة بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $purchase = $this->purchases->findWithRelations($id);

        DB::transaction(function () use ($purchase) {
            // Items cascade-delete via DB, but observers need to fire for stock
            foreach ($purchase->items as $item) {
                $item->delete();
            }
            $purchase->delete();
        });

        return redirect()->route('purchases.index')->with('success', 'تم حذف الفاتورة بنجاح');
    }
}
