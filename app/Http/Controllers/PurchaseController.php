<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Models\Product;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Http\Request;
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
            'purchases' => $this->purchases->allWithRelations(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Purchases/Create', [
            'suppliers'      => $this->suppliers->allActive(), // يخفي المورد النقدي (id=1) من القائمة
            'defaultSupplierId' => 1,
            'products'       => Product::with('category')->orderBy('name')->get(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(),
            'pageKey'        => uniqid(),
        ]);
    }

    public function storeWithItems(Request $request)
    {
        $data = $request->validate([
            'supplier_id'            => 'required|exists:suppliers,id',
            'notes'                  => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'required|exists:products,id',
            'items.*.quantity'       => 'required|numeric|min:0.01',
            'items.*.unit_cost'      => 'required|numeric|min:0',
            'payments'               => 'nullable|array',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount'      => 'required|numeric|min:0.01',
        ]);

        $purchase = $this->purchases->createPurchase($data);

        foreach ($data['items'] as $item) {
            $this->purchases->addItem($purchase->id, $item);
        }

        foreach ($data['payments'] ?? [] as $payment) {
            $this->purchases->addPayment($purchase->id, $payment);
        }

        return redirect()->route('purchases.show', $purchase->id)
            ->with('success', 'تم إنشاء فاتورة الشراء وتحديث المخزون');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'notes'       => 'nullable|string',
        ]);

        $purchase = $this->purchases->createPurchase($data);

        return redirect()->route('purchases.show', $purchase->id)
            ->with('success', 'تم إنشاء فاتورة الشراء');
    }

    public function show(int $id): Response
    {
        $purchase = $this->purchases->findWithRelations($id);
        $supplier = $purchase->supplier;

        // حساب الوضع المالي للمورد
        $supplierFinancialSummary = [
            'total_purchases' => $supplier->purchases()->sum('total'),
            'total_payments' => $supplier->supplierPayments()->sum('amount'),
            'total_settlements' => $supplier->supplierSettlements()->sum('amount'),
            'total_debt' => 0,
        ];
        $supplierFinancialSummary['total_debt'] = 
            $supplierFinancialSummary['total_purchases'] - 
            $supplierFinancialSummary['total_payments'] - 
            $supplierFinancialSummary['total_settlements'];

        return Inertia::render('Purchases/Show', [
            'purchase'       => $purchase,
            'products'       => Product::with('category')->orderBy('name')->get(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(),
            'supplierFinancialSummary' => $supplierFinancialSummary,
        ]);
    }

    public function addItem(Request $request, int $id)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity'   => 'required|numeric|min:0.01',
            'unit_cost'  => 'required|numeric|min:0',
        ]);

        try {
            $this->purchases->addItem($id, $data);
            return back()->with('success', 'تم إضافة المنتج وتحديث المخزون');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function updateItem(Request $request, int $id, int $itemId)
    {
        $data = $request->validate([
            'quantity'  => 'required|numeric|min:0.01',
            'unit_cost' => 'required|numeric|min:0',
        ]);

        try {
            $this->purchases->updateItem($id, $itemId, $data);
            return back()->with('success', 'تم تحديث المنتج');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function removeItem(int $id, int $itemId)
    {
        try {
            $this->purchases->removeItem($id, $itemId);
            return back()->with('success', 'تم حذف السطر وإعادة خصم المخزون');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function addPayment(Request $request, int $id)
    {
        $data = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount'            => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string',
        ]);

        try {
            $this->purchases->addPayment($id, $data);
            return back()->with('success', 'تم تسجيل الدفعة');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroy(int $id)
    {
        $purchase = $this->purchases->find($id);
        $supplierId = $purchase->supplier_id;

        // إعادة خصم المخزون لكل سطر
        foreach ($purchase->items as $item) {
            $item->product->decrement('stock', $item->quantity);
        }

        // purchase_id في supplier_payments سيصبح null تلقائياً (nullOnDelete)
        $purchase->delete();

        // إعادة حساب دين المورد
        $supplier = \App\Models\Supplier::find($supplierId);
        if ($supplier) {
            $totalPurchases = \App\Models\Purchase::where('supplier_id', $supplierId)->sum('total');
            $totalPaid      = \App\Models\SupplierPayment::where('supplier_id', $supplierId)->sum('amount');
            $totalSettled   = \App\Models\SupplierSettlement::where('supplier_id', $supplierId)->sum('amount');
            $totalDebt      = $totalPurchases - $totalPaid - $totalSettled;

            $supplier->update([
                'total_purchases' => $totalPurchases,
                'total_debt'      => $totalDebt,
            ]);
        }

        return redirect()->route('purchases.index')->with('success', 'تم حذف فاتورة الشراء');
    }
}
