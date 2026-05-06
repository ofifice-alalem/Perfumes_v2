<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\InvoiceReturn;
use App\Models\InvoiceReturnItem;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Settlement;
use App\Observers\InvoiceItemObserver;
use App\Repositories\Contracts\InvoiceReturnRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceReturnController extends Controller
{
    public function __construct(private InvoiceReturnRepositoryInterface $returns) {}

    public function index(): Response
    {
        return Inertia::render('InvoiceReturns/Index', [
            'returns'        => $this->returns->paginated(5),
            'customers'      => Customer::withoutCash()->orderBy('name')->get(['id', 'name']),
            'products'       => Product::orderBy('name')->get(['id', 'name']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(Request $request): Response
    {
        $customerId = $request->query('customer_id', 1);
        $invoiceId  = $request->query('invoice_id');

        $invoiceItems = [];
        if ($invoiceId) {
            $invoice = \App\Models\Invoice::with(['items.product', 'items.size'])->find($invoiceId);
            if ($invoice) {
                $invoiceItems = $invoice->items->map(fn($i) => [
                    'id'           => $i->id,
                    'product_id'   => $i->product_id,
                    'product_name' => $i->product->name,
                    'sale_type'    => $i->sale_type,
                    'size_id'      => $i->size_id,
                    'size_label'   => $i->size?->label,
                    'quantity'     => $i->quantity,
                    'unit_price'   => $i->unit_price,
                    'line_total'   => $i->line_total,
                ]);
            }
        }

        return Inertia::render('InvoiceReturns/Create', [
            'customers'      => Customer::orderBy('name')->get(['id', 'name']),
            'products'       => Product::with(['category', 'priceTier.tierPrices', 'productPrice', 'originalPerfumeDetail'])
                ->whereHas('category', fn($q) => $q->where('is_operational', false))
                ->orderBy('name')
                ->get()
                ->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'stock' => $p->stock,
                    'selling_type' => $p->selling_type,
                    'category' => $p->category ? [
                        'id' => $p->category->id,
                        'name' => $p->category->name,
                        'unit' => $p->category->unit,
                    ] : null,
                    'price_tier' => $p->priceTier ? [
                        'id' => $p->priceTier->id,
                        'name' => $p->priceTier->name,
                        'tier_prices' => $p->priceTier->tierPrices->map(fn($tp) => [
                            'size_id' => $tp->size_id,
                            'price_regular' => $tp->price_regular,
                            'price_vip' => $tp->price_vip,
                        ]),
                    ] : null,
                    'product_price' => $p->productPrice ? [
                        'price_per_unit_regular' => $p->productPrice->price_per_unit_regular,
                        'price_per_unit_vip' => $p->productPrice->price_per_unit_vip,
                        'full_bottle_regular' => $p->productPrice->full_bottle_regular,
                        'full_bottle_vip' => $p->productPrice->full_bottle_vip,
                    ] : null,
                    'original_perfume_detail' => $p->originalPerfumeDetail ? [
                        'bottle_volume' => $p->originalPerfumeDetail->bottle_volume,
                    ] : null,
                ]),
            'sizes' => \App\Models\Size::orderBy('value')->get(['id', 'label', 'value']),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
            'selected_customer_id' => (int) $customerId,
            'selected_invoice_id'  => $invoiceId ? (int) $invoiceId : null,
            'invoice_items'        => $invoiceItems,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'customer_id'                  => 'required|exists:customers,id',
            'invoice_id'                   => 'nullable|exists:invoices,id',
            'notes'                        => 'nullable|string',
            'items'                        => 'required|array|min:1',
            'items.*.product_id'           => 'required|exists:products,id',
            'items.*.quantity'             => 'required|numeric|min:0.01',
            'items.*.unit_price'           => 'required|numeric|min:0',
            'items.*.line_total'           => 'required|numeric|min:0',
            'create_settlement'            => 'nullable|boolean',
            'settlement'                   => 'nullable|array',
            'settlement.payment_method_id' => 'nullable|exists:payment_methods,id',
            'settlement.amount'            => 'nullable|numeric|min:0.01',
            'settlement.notes'             => 'nullable|string',
        ]);

        $invoiceReturn = DB::transaction(function () use ($data) {
            $isCash = (int) $data['customer_id'] === 1;

            $ret = InvoiceReturn::create([
                'customer_id'      => $data['customer_id'],
                'invoice_id'       => $data['invoice_id'] ?? null,
                'total'            => 0,
                'recovered_amount' => 0,
                'due_recovery'     => 0,
                'recovery_status'  => 'unpaid',
                'notes'            => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                InvoiceReturnItem::create([
                    'invoice_return_id' => $ret->id,
                    'product_id'        => $item['product_id'],
                    'quantity'          => $item['quantity'],
                    'unit_price'        => $item['unit_price'],
                    'line_total'        => $item['line_total'],
                ]);
            }

            $ret->refresh();

            // تسوية تلقائية للزبون النقدي أو إذا طُلبت
            $createSettlement = $isCash || ($data['create_settlement'] ?? false);

            if ($createSettlement && isset($data['settlement']['payment_method_id'])) {
                $s = $data['settlement'];
                $settlement = Settlement::create([
                    'customer_id'       => $data['customer_id'],
                    'invoice_id'        => $data['invoice_id'] ?? null,
                    'invoice_return_id' => $ret->id,
                    'payment_method_id' => $s['payment_method_id'],
                    'amount'            => $s['amount'] ?? $ret->total,
                    'notes'             => $s['notes'] ?? null,
                    'created_at'        => now(),
                ]);

                $ret->settlement_id = $settlement->id;
                $ret->save();
            }

            return $ret;
        });

        return redirect()->route('invoice-returns.show', $invoiceReturn->id)
            ->with('success', 'تم تسجيل المرتجع بنجاح');
    }

    public function show(int $id): Response
    {
        return Inertia::render('InvoiceReturns/Show', [
            'return'         => $this->returns->findWithRelations($id),
            'paymentMethods' => PaymentMethod::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function destroy(int $id): RedirectResponse
    {
        $ret = $this->returns->findWithRelations($id);

        DB::transaction(function () use ($ret) {
            foreach ($ret->items as $item) {
                Product::where('id', $item->product_id)->decrement('stock', $item->quantity);
            }

            $ret->delete();

            if ($ret->customer_id && $ret->customer_id !== 1) {
                InvoiceItemObserver::recalculateCustomer($ret->customer_id);
            }
        });

        return redirect()->route('invoice-returns.index')->with('success', 'تم إلغاء المرتجع بنجاح');
    }

    public function restore(int $id): RedirectResponse
    {
        $ret = InvoiceReturn::withTrashed()->findOrFail($id);

        DB::transaction(function () use ($ret) {
            $ret->restore();

            foreach ($ret->items as $item) {
                Product::where('id', $item->product_id)->increment('stock', $item->quantity);
            }

            if ($ret->customer_id && $ret->customer_id !== 1) {
                InvoiceItemObserver::recalculateCustomer($ret->customer_id);
            }
        });

        return redirect()->route('invoice-returns.show', $id)->with('success', 'تم استعادة المرتجع بنجاح');
    }
}
