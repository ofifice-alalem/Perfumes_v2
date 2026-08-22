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
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Invoices/Create', [
            'customers'      => Customer::where('is_active', true)->orderBy('name')->get(['id', 'name', 'total_debt']),
            'products'       => Product::with([
                    'category:id,name,unit,is_operational',
                    'priceTier:id,name',
                    'priceTier.tierPrices:id,tier_id,size_id,price_regular,price_vip',
                    'priceTier.tierPrices.size:id,label,value,unit',
                    'productPrice:id,product_id,price_per_unit_regular,price_per_unit_vip,full_bottle_regular,full_bottle_vip',
                    'originalPerfumeDetail:id,product_id,bottle_volume',
                ])
                ->whereHas('category', fn($q) => $q->where('is_operational', false))
                ->orderBy('name')
                ->get(['id', 'name', 'category_id', 'price_tier_id', 'selling_type', 'stock', 'qrcode']),
            'sizes'          => Size::orderBy('label')->get(['id', 'label', 'value', 'unit']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
            'recentInvoices' => Invoice::with(['customer', 'user', 'items.product', 'items.size'])
                ->latest('id')
                ->take(4)
                ->get()
                ->map(fn($inv) => [
                    'id'            => $inv->id,
                    'customer_name' => $inv->customer ? $inv->customer->name : 'زبون نقدي',
                    'user_name'     => $inv->user ? $inv->user->name : 'الكاشير',
                    'total'         => (float)$inv->total,
                    'paid_amount'   => (float)$inv->paid_amount,
                    'created_at'    => $inv->created_at ? $inv->created_at->format('Y-m-d h:i A') : '',
                    'items_count'   => $inv->items->count(),
                    'items_summary' => $inv->items->take(2)->map(function($i) {
                        $name = $i->product ? $i->product->name : 'منتج';
                        $size = $i->size ? ' (' . $i->size->label . ')' : '';
                        return $name . $size;
                    })->join('، '),
                ]),
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

        return redirect()->route('invoices.create')
            ->with('success', 'تم إنشاء فاتورة البيع بنجاح #' . $invoice->id)
            ->with('created_invoice_id', $invoice->id)
            ->with('updated_stocks', $updatedStocks);
    }

    public function show(int $id): Response
    {
        return Inertia::render('Invoices/Show', [
            'invoice'        => $this->invoices->findWithRelations($id),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
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
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
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
