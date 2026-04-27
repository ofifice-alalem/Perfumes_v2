<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Size;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceRepositoryInterface $invoices) {}

    public function index(): Response
    {
        return Inertia::render('Invoices/Index', [
            'invoices' => $this->invoices->allWithRelations(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Invoices/Create', [
            'customers'      => Customer::where('is_active', true)->orderBy('name')->get(),
            'products'       => Product::with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail', 'priceTier.tierPrices'])->orderBy('name')->get(),
            'sizes'          => Size::where('unit', 'ml')->orderBy('value')->get(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    public function storeWithItems(Request $request)
    {
        $data = $request->validate([
            'customer_id'                  => 'nullable|exists:customers,id',
            'customer_type'                => 'required|in:regular,vip',
            'notes'                        => 'nullable|string',
            'items'                        => 'required|array|min:1',
            'items.*.product_id'           => 'required|exists:products,id',
            'items.*.sale_type'            => 'required|in:tier_decant,unit_decant,full_bottle,unit_based',
            'items.*.size_id'              => 'nullable|exists:sizes,id',
            'items.*.quantity'             => 'required|numeric|min:0.01',
            'items.*.unit_price'           => 'required|numeric|min:0',
            'items.*.line_total'           => 'required|numeric|min:0',
            'payments'                     => 'nullable|array',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount'            => 'required|numeric|min:0.01',
        ]);

        $data['user_id'] = Auth::id() ?? 1;
        $invoice = $this->invoices->createInvoice($data);

        foreach ($data['items'] as $item) {
            $this->invoices->addItem($invoice->id, $item);
        }

        foreach ($data['payments'] ?? [] as $payment) {
            $this->invoices->addPayment($invoice->id, $payment);
        }

        return redirect()->route('invoices.show', $invoice->id)
            ->with('success', 'تم إنشاء الفاتورة بنجاح');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id'   => 'nullable|exists:customers,id',
            'customer_type' => 'required|in:regular,vip',
            'notes'         => 'nullable|string',
        ]);

        $data['user_id'] = Auth::id() ?? 1;

        $invoice = $this->invoices->createInvoice($data);

        return redirect()->route('invoices.show', $invoice->id)
            ->with('success', 'تم إنشاء الفاتورة بنجاح');
    }

    public function show(int $id): Response
    {
        return Inertia::render('Invoices/Show', [
            'invoice'        => $this->invoices->findWithRelations($id),
            'products'       => Product::with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail', 'priceTier.tierPrices'])->orderBy('name')->get(),
            'sizes'          => Size::where('unit', 'ml')->orderBy('value')->get(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    public function addItem(Request $request, int $id)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'sale_type'  => 'required|in:tier_decant,unit_decant,full_bottle,unit_based',
            'size_id'    => 'nullable|exists:sizes,id',
            'quantity'   => 'nullable|numeric|min:0.01',
        ]);

        try {
            $this->invoices->addItem($id, $data);
            return back()->with('success', 'تم إضافة المنتج');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function removeItem(int $id, int $itemId)
    {
        try {
            $this->invoices->removeItem($id, $itemId);
            return back()->with('success', 'تم حذف السطر');
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
            $this->invoices->addPayment($id, $data);
            return back()->with('success', 'تم تسجيل الدفعة');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroy(int $id)
    {
        $invoice = $this->invoices->find($id);

        // إعادة المخزون لكل سطر
        foreach ($invoice->items as $item) {
            $item->product->increment('stock', $item->quantity);
        }

        $invoice->delete();

        return redirect()->route('invoices.index')->with('success', 'تم حذف الفاتورة');
    }
}
