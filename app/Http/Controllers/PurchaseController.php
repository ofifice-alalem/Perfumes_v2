<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Supplier;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function __construct(private PurchaseRepositoryInterface $purchases) {}

    public function index(): Response
    {
        return Inertia::render('Purchases/Index', [
            'purchases' => $this->purchases->allWithRelations(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Purchases/Create', [
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(),
            'products' => Product::with(['category'])->orderBy('name')->get(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'notes' => 'nullable|string',
        ]);

        $purchase = $this->purchases->createPurchase($data);

        return redirect()->route('purchases.show', $purchase->id)
            ->with('success', 'تم إنشاء فاتورة الشراء بنجاح');
    }

    public function show(int $id): Response
    {
        return Inertia::render('Purchases/Show', [
            'purchase' => $this->purchases->findWithRelations($id),
            'products' => Product::with(['category'])->orderBy('name')->get(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    public function addItem(Request $request, int $id)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0.01',
            'unit_cost' => 'required|numeric|min:0',
        ]);

        try {
            $this->purchases->addItem($id, $data);
            return back()->with('success', 'تم إضافة المنتج');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function removeItem(int $id, int $itemId)
    {
        try {
            $this->purchases->removeItem($id, $itemId);
            return back()->with('success', 'تم حذف السطر');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function addPayment(Request $request, int $id)
    {
        $data = $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
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

        // إعادة المخزون لكل سطر
        foreach ($purchase->items as $item) {
            $item->product->decrement('stock', $item->quantity);
        }

        $purchase->delete();

        return redirect()->route('purchases.index')->with('success', 'تم حذف فاتورة الشراء');
    }
}