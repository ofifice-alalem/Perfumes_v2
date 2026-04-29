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
        $invoiceData = session('invoiceData');
        
        return Inertia::render('Invoices/Create', [
            'customers'      => Customer::where('is_active', true)->orderBy('name')->get(),
            'products'       => Product::with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail', 'priceTier.tierPrices'])->orderBy('name')->get(),
            'sizes'          => Size::where('unit', 'ml')->orderBy('value')->get(),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(),
            'invoice'        => $invoiceData,
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

        // Get the complete invoice with all relations for the modal
        $completeInvoice = $this->invoices->findWithRelations($invoice->id);
        
        // Format the invoice data for the frontend modal
        $invoiceData = [
            'id' => $completeInvoice->id,
            'invoice_number' => $completeInvoice->invoice_number ?? 'INV-' . $completeInvoice->id,
            'customer_name' => $completeInvoice->customer ? $completeInvoice->customer->name : 'زبون نقدي',
            'customer_type' => $completeInvoice->customer_type,
            'seller_name' => $completeInvoice->user->name ?? 'غير محدد',
            'total_amount' => (float) ($completeInvoice->total_amount ?? $completeInvoice->items->sum('line_total')),
            'notes' => $completeInvoice->notes,
            'created_at' => $completeInvoice->created_at->toISOString(),
            'items' => $completeInvoice->items->map(function ($item) {
                return [
                    'product_name' => $item->product->name,
                    'sale_type' => $item->sale_type,
                    'size_label' => $item->size ? $item->size->label : '',
                    'quantity' => (string) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                ];
            }),
            'payments' => $completeInvoice->payments->map(function ($payment) {
                return [
                    'method_name' => $payment->paymentMethod->name,
                    'amount' => (float) $payment->amount,
                ];
            }),
        ];

        return redirect()->route('invoices.create')
            ->with('success', 'تم إنشاء الفاتورة بنجاح')
            ->with('invoiceData', $invoiceData);
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
