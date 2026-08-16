<?php

namespace App\Http\Controllers;

use App\Models\Customer;
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
            'products'       => Product::with(['category', 'priceTier.tierPrices.size', 'productPrice', 'originalPerfumeDetail'])
                ->whereHas('category', fn($q) => $q->where('is_operational', false))
                ->orderBy('name')->get(),
            'sizes'          => Size::orderBy('label')->get(['id', 'label', 'value', 'unit']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreInvoiceRequest $request, CreateInvoiceAction $action): RedirectResponse
    {
        $action->execute($request->validated(), $request->getCustomerId());

        return redirect()->route('invoices.create')
            ->with('success', 'تم إنشاء فاتورة البيع بنجاح');
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

    public function restore(int $id): RedirectResponse
    {
        $invoice = \App\Models\Invoice::withTrashed()->findOrFail($id);

        DB::transaction(function () use ($invoice) {
            $invoice->restore();

            // استعادة الدفعات المحذوفة المرتبطة بالفاتورة
            Payment::onlyTrashed()
                ->where('invoice_id', $invoice->id)
                ->restore();

            // استعادة التسويات المحذوفة المرتبطة بالفاتورة
            Settlement::onlyTrashed()
                ->where('invoice_id', $invoice->id)
                ->restore();

            foreach ($invoice->items as $item) {
                Product::where('id', $item->product_id)->decrement('stock', $item->quantity);
            }

            if ($invoice->customer_id && $invoice->customer_id) {
                InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
            }
        });

        return redirect()->route('invoices.show', $id)->with('success', 'تم استعادة الفاتورة بنجاح');
    }
}
