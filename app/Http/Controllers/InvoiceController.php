<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Settlement;
use App\Models\Size;
use App\Models\User;
use App\Observers\InvoiceItemObserver;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Actions\Invoices\CreateInvoiceAction;
use App\Actions\Invoices\UpdateInvoiceAction;
use App\Actions\Invoices\CancelInvoiceAction;
use App\Actions\Invoices\RestoreInvoiceAction;

class InvoiceController extends Controller
{
    public function __construct(private InvoiceRepositoryInterface $invoices) {}

    public function index(): Response
    {
        return Inertia::render('Invoices/Index', [
            'invoices'       => $this->invoices->paginated(20),
            'customers'      => Customer::withoutCash()->orderBy('name')->get(['id', 'name', 'is_active']),
            'users'          => User::orderBy('name')->get(['id', 'name']),
            'products'       => Product::orderBy('name')->get(['id', 'name']),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Invoices/Create', [
            'customers'      => fn() => Customer::where('is_active', true)->orderBy('name')->get(['id', 'name', 'total_debt']),
            'products'       => fn() => $this->invoices->getPosCatalog(),
            'sizes'          => fn() => \Illuminate\Support\Facades\Cache::remember('pos_sizes_list', 86400, fn() => Size::orderBy('label')->get(['id', 'label', 'value', 'unit'])->toArray()),
            'paymentMethods' => fn() => \Illuminate\Support\Facades\Cache::remember('pos_payment_methods_list', 86400, fn() => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name'])->toArray()),
            'recentInvoices' => fn() => $this->invoices->getRecentInvoicesFormatted(4),
        ]);
    }

    public function refreshCatalog(): \Illuminate\Http\JsonResponse
    {
        \Illuminate\Support\Facades\Cache::forget('pos_products_catalog_base');
        \Illuminate\Support\Facades\Cache::forget('pos_sizes_list');
        \Illuminate\Support\Facades\Cache::forget('pos_payment_methods_list');

        $catalog = $this->invoices->getPosCatalog();

        return response()->json([
            'success'  => true,
            'message'  => 'تم تحديث قائمة المنتجات والمخزون بنجاح',
            'count'    => count($catalog),
            'products' => $catalog,
        ]);
    }

    public function store(StoreInvoiceRequest $request, CreateInvoiceAction $action): RedirectResponse
    {
        $invoice = $action->execute($request->validated(), $request->getCustomerId());

        if ($request->boolean('auto_print_node', true)) {
            app(NodeThermalPrinterController::class)->dispatchDirectPrint($invoice->id);
        }

        $productIds = $invoice->items->pluck('product_id')->unique()->values()->all();
        $updatedStocks = Product::whereIn('id', $productIds)->pluck('stock', 'id')->map(fn($st) => (string)$st)->all();

        $displayNumber = $invoice->invoice_number ?? $invoice->id;

        return redirect()->route('invoices.create')
            ->with('success', 'تم إنشاء فاتورة البيع بنجاح #' . $displayNumber)
            ->with('created_invoice_id', $invoice->id)
            ->with('created_invoice_number', $displayNumber)
            ->with('updated_stocks', $updatedStocks);
    }

    public function show(int $id): Response
    {
        return Inertia::render('Invoices/Show', [
            'invoice'        => $this->invoices->findWithRelations($id),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function edit(int $id): Response
    {
        return Inertia::render('Invoices/Edit', [
            'invoice'        => $this->invoices->findWithRelations($id),
            'customers'      => Customer::where('is_active', true)->orderBy('name')->get(['id', 'name', 'total_debt']),
            'products'       => Product::with(['category', 'priceTier.tierPrices.size', 'productPrice', 'originalPerfumeDetail'])
                ->whereHas('category', fn($q) => $q->where('is_operational', false))
                ->orderBy('name')->get(),
            'sizes'          => Size::orderBy('label')->get(['id', 'label', 'value', 'unit']),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateInvoiceRequest $request, int $id, UpdateInvoiceAction $action): RedirectResponse
    {
        $action->execute($id, $request->validated(), $request->getCustomerId());

        return redirect()->route('invoices.show', $id)->with('success', 'تم تحديث الفاتورة بنجاح');
    }

    public function destroy(int $id, CancelInvoiceAction $action): RedirectResponse
    {
        $deletePayments    = request()->boolean('delete_payments', false);
        $deleteSettlements = request()->boolean('delete_settlements', false);

        $action->execute($id, $deletePayments, $deleteSettlements);

        return redirect()->route('invoices.index')->with('success', 'تم إلغاء الفاتورة بنجاح');
    }

    public function restore(int $id, RestoreInvoiceAction $action): RedirectResponse
    {
        $action->execute($id);

        return redirect()->route('invoices.show', $id)->with('success', 'تم استعادة الفاتورة بنجاح');
    }
}
