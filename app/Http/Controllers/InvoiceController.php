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

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'customer_id'                    => 'nullable|exists:customers,id',
            'customer_type'                  => 'nullable|in:regular,vip',
            'notes'                          => 'nullable|string',
            'items'                          => 'required|array|min:1',
            'items.*.product_id'             => 'required|exists:products,id',
            'items.*.size_id'                => 'nullable|exists:sizes,id',
            'items.*.sale_type'              => 'required|in:tier_decant,unit_decant,full_bottle,unit_based',
            'items.*.quantity'               => 'required|numeric|min:0.01',
            'items.*.unit_price'             => 'nullable|numeric|min:0',
            'items.*.line_total'             => 'nullable|numeric|min:0',
            'payments'                       => 'nullable|array',
            'payments.*.payment_method_id'   => 'required|exists:payment_methods,id',
            'payments.*.amount'              => 'required|numeric|min:0.01',
            'payments.*.notes'               => 'nullable|string',
            'debt_payment'                   => 'nullable|array',
            'debt_payment.payment_method_id' => 'required_with:debt_payment|exists:payment_methods,id',
            'debt_payment.amount'            => 'required_with:debt_payment|numeric|min:0.01',
        ]);

        // إذا كان customer_id فارغاً أو null → زبون نقدي (id=1)
        $customerId = $request->input('customer_id');
        $customerId = ($customerId && $customerId !== 'null') ? (int)$customerId : 1;

        $invoice = DB::transaction(function () use ($data, $customerId) {
            $customer = Customer::findOrFail($customerId);
            $customerType = $data['customer_type'] ?? ($customer->id === 1 ? 'regular' : ($customer->total_debt < 0 ? 'vip' : 'regular'));
            $isVip = $customerType === 'vip';

            // 1. تجميع وتحديد الكميات المطلوبة لكل منتج لمنع خصم أكثر من المخزون عند تكرار نفس المنتج
            $productQuantities = [];
            foreach ($data['items'] as $item) {
                $pid = (int) $item['product_id'];
                $qty = (float) $item['quantity'];
                $productQuantities[$pid] = ($productQuantities[$pid] ?? 0) + $qty;
            }

            // 2. حجز وقفل سجلات المنتجات لمنع تزامن الطلبات (Pessimistic Locking / Race Condition Protection)
            $products = Product::with(['productPrice', 'priceTier.tierPrices', 'originalPerfumeDetail'])
                ->whereIn('id', array_keys($productQuantities))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // 3. التحقق الصارم من توفر رصيد كافٍ قبل أي تعديل (Negative Stock Protection)
            foreach ($productQuantities as $pid => $totalRequestedQty) {
                $product = $products->get($pid);
                if (!$product) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => "المنتج غير موجود (رمز: {$pid})"
                    ]);
                }

                if ($product->stock < $totalRequestedQty) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'items' => "المخزون غير كافٍ للمنتج ({$product->name}). المتاح: " . (float)$product->stock . " ، المطلوب: {$totalRequestedQty}"
                    ]);
                }
            }

            // 4. إنشاء الفاتورة الأساسية (تستدعي PeriodObserver تلقائياً لتثبيت period_id)
            $invoice = \App\Models\Invoice::create([
                'user_id'         => Auth::id() ?? 1,
                'customer_id'     => $customerId,
                'customer_type'   => $customerType,
                'total'           => 0,
                'paid_amount'     => 0,
                'due_amount'      => 0,
                'payment_status'  => 'unpaid',
                'notes'           => $data['notes'] ?? null,
            ]);

            // 5. إنشاء عناصر الفاتورة بأسعار السيرفر الرسمية (بدون withoutEvents لعمل Observers و PeriodObserver و Auditing)
            $totalInvoiceCents = 0;

            foreach ($data['items'] as $item) {
                $pid      = (int) $item['product_id'];
                $product  = $products->get($pid);
                $qty      = (float) $item['quantity'];
                $saleType = $item['sale_type'];
                $sizeId   = !empty($item['size_id']) && is_numeric($item['size_id']) ? (int) $item['size_id'] : null;

                // احتساب السعر والإجمالي رسمياً في السيرفر (Fix #1: Never Trust Client Prices)
                [$authoritativeUnitPrice, $authoritativeLineTotal] = $this->calculateAuthoritativePrices(
                    $product,
                    $saleType,
                    $sizeId,
                    $qty,
                    $isVip
                );

                // احتساب المبالغ بالأجزاء الصحيحة (Fix #4: Integer Cent Money Calculations)
                $lineTotalCents = (int) round($authoritativeLineTotal * 100);
                $totalInvoiceCents += $lineTotalCents;

                // إنشاء عنصر الفاتورة (InvoiceItemObserver يقضي بتنقيص المخزون وتحديث السجلات)
                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'product_id'  => $pid,
                    'size_id'     => $sizeId,
                    'sale_type'   => $saleType,
                    'quantity'    => $qty,
                    'unit_price'  => number_format($authoritativeUnitPrice, 2, '.', ''),
                    'line_total'  => number_format($authoritativeLineTotal, 2, '.', ''),
                ]);
            }

            // 6. تسجيل الدفعات المرتبطة للفاتورة (بدون withoutEvents لعمل PeriodObserver و PaymentObserver و Auditing)
            $totalPaidCents = 0;
            foreach ($data['payments'] ?? [] as $payment) {
                $amount = (float) $payment['amount'];
                if ($amount <= 0) continue;

                $paymentCents = (int) round($amount * 100);
                $totalPaidCents += $paymentCents;

                Payment::create([
                    'customer_id'       => $invoice->customer_id,
                    'user_id'           => Auth::id(),
                    'invoice_id'        => $invoice->id,
                    'payment_method_id' => $payment['payment_method_id'],
                    'amount'            => number_format($amount, 2, '.', ''),
                    'notes'             => $payment['notes'] ?? null,
                    'created_at'        => now(),
                ]);
            }

            // 7. تسجيل دفعة سداد الدين المستقلة إن وجدت
            if (!empty($data['debt_payment']) && $invoice->customer_id) {
                $dp = $data['debt_payment'];
                $dpAmount = (float) $dp['amount'];
                if ($dpAmount > 0) {
                    Payment::create([
                        'customer_id'       => $invoice->customer_id,
                        'user_id'           => Auth::id(),
                        'invoice_id'        => null,
                        'payment_method_id' => $dp['payment_method_id'],
                        'amount'            => number_format($dpAmount, 2, '.', ''),
                        'notes'             => 'سداد دين',
                        'created_at'        => now(),
                    ]);
                }
            }

            // 8. تحديث إجماليات الفاتورة والحالة وحفظ عادي لتأكيد العمليات
            $dueCents = max(0, $totalInvoiceCents - $totalPaidCents);

            $invoice->total       = number_format($totalInvoiceCents / 100, 2, '.', '');
            $invoice->paid_amount = number_format($totalPaidCents / 100, 2, '.', '');
            $invoice->due_amount  = number_format($dueCents / 100, 2, '.', '');
            $invoice->payment_status = match (true) {
                $totalPaidCents <= 0                  => 'unpaid',
                $totalPaidCents >= $totalInvoiceCents => 'paid',
                default                               => 'partial',
            };
            $invoice->save();

            if ($invoice->customer_id) {
                InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
            }

            return $invoice;
        });

        return redirect()->route('invoices.create')
            ->with('success', 'تم إنشاء فاتورة البيع بنجاح');
    }

    private function calculateAuthoritativePrices(Product $product, string $saleType, ?int $sizeId, float $qty, bool $isVip): array
    {
        $pp = $product->productPrice;
        $pt = $product->priceTier;

        $unitPrice = 0.0;
        $lineTotal = 0.0;

        switch ($saleType) {
            case 'tier_decant':
                if ($sizeId) {
                    $tp = $pt?->tierPrices?->firstWhere('size_id', $sizeId);
                    $unitPrice = (float) ($tp ? ($isVip ? $tp->price_vip : $tp->price_regular) : 0);

                    $size = Size::find($sizeId);
                    $sizeValue = $size ? (float) $size->value : 0;
                    $count = ($sizeValue > 0) ? ($qty / $sizeValue) : 1;
                    $lineTotal = $unitPrice * $count;
                } else {
                    $unitPrice = (float) ($pp ? ($isVip ? $pp->price_per_unit_vip : $pp->price_per_unit_regular) : 0);
                    $lineTotal = $unitPrice * $qty;
                }
                break;

            case 'unit_decant':
            case 'unit_based':
                $unitPrice = (float) ($pp ? ($isVip ? $pp->price_per_unit_vip : $pp->price_per_unit_regular) : 0);
                $lineTotal = $unitPrice * $qty;
                break;

            case 'full_bottle':
                $unitPrice = (float) ($pp ? ($isVip ? ($pp->full_bottle_vip ?? 0) : ($pp->full_bottle_regular ?? 0)) : 0);
                $bottleVol = (float) ($product->originalPerfumeDetail?->bottle_volume ?? 0);
                $count = ($bottleVol > 0) ? ($qty / $bottleVol) : 1;
                $lineTotal = $unitPrice * $count;
                break;
        }

        return [$unitPrice, $lineTotal];
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

    public function update(Request $request, int $id): RedirectResponse
    {
        $data = $request->validate([
            'customer_id'                    => 'nullable|exists:customers,id',
            'customer_type'                  => 'nullable|in:regular,vip',
            'notes'                          => 'nullable|string',
            'items'                          => 'required|array|min:1',
            'items.*.product_id'             => 'required|exists:products,id',
            'items.*.size_id'                => 'nullable|exists:sizes,id',
            'items.*.sale_type'              => 'required|in:tier_decant,unit_decant,full_bottle,unit_based',
            'items.*.quantity'               => 'required|numeric|min:0.01',
            'items.*.unit_price'             => 'required|numeric|min:0',
            'items.*.line_total'             => 'required|numeric|min:0',
            'payments'                       => 'nullable|array',
            'payments.*.payment_method_id'   => 'required|exists:payment_methods,id',
            'payments.*.amount'              => 'required|numeric|min:0.01',
            'payments.*.notes'               => 'nullable|string',
        ]);

        $customerId = $request->input('customer_id');
        $data['customer_id'] = ($customerId && $customerId !== 'null') ? (int)$customerId : 1;

        DB::transaction(function () use ($data, $id) {
            $invoice = \App\Models\Invoice::findOrFail($id);
            $oldCustomerId = $invoice->customer_id;

            // حذف العناصر القديمة (observer سيرجع المخزون)
            foreach ($invoice->items as $item) {
                $item->delete();
            }

            // تحديث بيانات الفاتورة
            $customer = Customer::findOrFail($data['customer_id']);
            $invoice->update([
                'customer_id'     => $data['customer_id'],
                'customer_type'   => $data['customer_type'] ?? ($customer->id === 1 ? 'regular' : ($customer->total_debt < 0 ? 'vip' : 'regular')),
                'notes'           => $data['notes'] ?? null,
            ]);

            // إضافة العناصر الجديدة (observer سيخصم المخزون)
            foreach ($data['items'] as $item) {
                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
                    'product_id'  => $item['product_id'],
                    'size_id'     => $item['size_id'] ?? null,
                    'sale_type'   => $item['sale_type'],
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'line_total'  => $item['line_total'],
                ]);
            }

            $invoice->refresh();

            $existingPayments = Payment::where('invoice_id', $invoice->id)->get();
            $newPaymentsList = $data['payments'] ?? [];

            // إضافة وتحديث الدفعات
            foreach ($newPaymentsList as $paymentData) {
                $amount = (float) $paymentData['amount'];
                if ($amount <= 0) continue;

                $existing = $existingPayments->firstWhere('payment_method_id', $paymentData['payment_method_id']);
                if ($existing) {
                    $existing->update([
                        'amount' => $amount,
                        'notes'  => $paymentData['notes'] ?? null,
                    ]);
                    $existingPayments = $existingPayments->reject(fn($p) => $p->id === $existing->id);
                } else {
                    Payment::create([
                        'customer_id'       => $invoice->customer_id,
                        'user_id'           => Auth::id(),
                        'invoice_id'        => $invoice->id,
                        'payment_method_id' => $paymentData['payment_method_id'],
                        'amount'            => $amount,
                        'notes'             => $paymentData['notes'] ?? null,
                        'created_at'        => now(),
                    ]);
                }
            }

            // حذف الدفعات التي لم تعد موجودة في التعديل الجديد
            foreach ($existingPayments as $oldPayment) {
                $oldPayment->delete();
            }

            // إعادة حساب العميل القديم إذا تغير
            if ($oldCustomerId && $oldCustomerId !== $data['customer_id']) {
                InvoiceItemObserver::recalculateCustomer($oldCustomerId);
            }
            if ($data['customer_id']) {
                InvoiceItemObserver::recalculateCustomer($data['customer_id']);
            }
        });

        return redirect()->route('invoices.show', $id)->with('success', 'تم تحديث الفاتورة بنجاح');
    }

    public function destroy(int $id): RedirectResponse
    {
        $invoice           = $this->invoices->findWithRelations($id);
        $isCash            = $invoice->customer_id === 1;
        $deletePayments    = $isCash ? true : request()->boolean('delete_payments', false);
        $deleteSettlements = $isCash ? true : request()->boolean('delete_settlements', false);

        DB::transaction(function () use ($invoice, $deletePayments, $deleteSettlements) {
            foreach ($invoice->items as $item) {
                Product::where('id', $item->product_id)->increment('stock', $item->quantity);
            }

            if ($deletePayments) {
                Payment::where('invoice_id', $invoice->id)->delete();
            } else {
                Payment::where('invoice_id', $invoice->id)->update(['invoice_id' => null]);
            }

            if ($deleteSettlements) {
                Settlement::where('invoice_id', $invoice->id)->delete();
            } else {
                Settlement::where('invoice_id', $invoice->id)->update(['invoice_id' => null]);
            }

            $invoice->delete();

            if ($invoice->customer_id) {
                InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
            }
        });

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
