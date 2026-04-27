<?php

namespace App\Repositories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Customer;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Illuminate\Support\Facades\DB;

class InvoiceRepository extends BaseRepository implements InvoiceRepositoryInterface
{
    public function __construct(Invoice $model)
    {
        parent::__construct($model);
    }

    public function allWithRelations()
    {
        return $this->model
            ->with(['user', 'customer', 'items.product', 'items.size', 'payments.paymentMethod'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->with(['user', 'customer', 'items.product.category', 'items.size', 'payments.paymentMethod'])
            ->findOrFail($id);
    }

    public function createInvoice(array $data): Invoice
    {
        return $this->model->create([
            'user_id'        => $data['user_id'],
            'customer_id'    => $data['customer_id'] ?? 1,
            'customer_type'  => $data['customer_type'] ?? 'regular',
            'total'          => 0,
            'paid_amount'    => 0,
            'due_amount'     => 0,
            'payment_status' => 'unpaid',
            'notes'          => $data['notes'] ?? null,
        ]);
    }

    public function addItem(int $invoiceId, array $itemData): void
    {
        DB::transaction(function () use ($invoiceId, $itemData) {
            $invoice = $this->model->findOrFail($invoiceId);
            $product = Product::findOrFail($itemData['product_id']);

            // حساب السعر حسب نوع البيع
            [$unitPrice, $quantity] = $this->resolvePrice($invoice, $product, $itemData);

            // التحقق من المخزون
            if ($product->stock < $quantity) {
                throw new \Exception("المخزون غير كافٍ. المتاح: {$product->stock}");
            }

            // line_total حسب نوع البيع
            $lineTotal = match($itemData['sale_type']) {
                'tier_decant', 'full_bottle' => $unitPrice,          // سعر ثابت
                default                      => $unitPrice * $quantity, // سعر × كمية
            };

            // إضافة السطر
            InvoiceItem::create([
                'invoice_id' => $invoiceId,
                'product_id' => $product->id,
                'size_id'    => $itemData['size_id'] ?? null,
                'sale_type'  => $itemData['sale_type'],
                'quantity'   => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ]);

            // خصم المخزون
            $product->decrement('stock', $quantity);

            // تحديث إجمالي الفاتورة
            $this->recalculateInvoice($invoice);
        });
    }

    public function removeItem(int $invoiceId, int $itemId): void
    {
        DB::transaction(function () use ($invoiceId, $itemId) {
            $item = InvoiceItem::where('invoice_id', $invoiceId)->findOrFail($itemId);

            // إعادة المخزون
            Product::findOrFail($item->product_id)->increment('stock', $item->quantity);

            $item->delete();

            $invoice = $this->model->findOrFail($invoiceId);
            $this->recalculateInvoice($invoice);
        });
    }

    public function addPayment(int $invoiceId, array $paymentData): void
    {
        DB::transaction(function () use ($invoiceId, $paymentData) {
            $invoice = $this->model->findOrFail($invoiceId);

            // التحقق أن المبلغ لا يتجاوز المتبقي
            if ($paymentData['amount'] > $invoice->due_amount) {
                throw new \Exception("المبلغ يتجاوز المتبقي: {$invoice->due_amount}");
            }

            Payment::create([
                'invoice_id'        => $invoiceId,
                'payment_method_id' => $paymentData['payment_method_id'],
                'amount'            => $paymentData['amount'],
                'notes'             => $paymentData['notes'] ?? null,
            ]);

            $this->recalculateInvoice($invoice->fresh());
            $this->updateCustomerDebt($invoice->fresh());
        });
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    private function resolvePrice(Invoice $invoice, Product $product, array $itemData): array
    {
        $isVip = $invoice->customer_type === 'vip';
        $saleType = $itemData['sale_type'];

        switch ($saleType) {
            case 'tier_decant':
                $size = \App\Models\Size::findOrFail($itemData['size_id']);
                $tierPrice = \App\Models\TierPrice::where('tier_id', $product->price_tier_id)
                    ->where('size_id', $size->id)
                    ->firstOrFail();
                $price = $isVip ? $tierPrice->price_vip : $tierPrice->price_regular;
                return [$price, $size->value];

            case 'unit_decant':
                $size = \App\Models\Size::findOrFail($itemData['size_id']);
                $pp = $product->productPrice;
                $price = $isVip ? $pp->price_per_unit_vip : $pp->price_per_unit_regular;
                return [$price, $size->value];

            case 'full_bottle':
                $pp = $product->productPrice;
                $price = $isVip ? $pp->full_bottle_vip : $pp->full_bottle_regular;
                $volume = $product->originalPerfumeDetail->bottle_volume;
                return [$price, $volume];

            case 'unit_based':
                $pp = $product->productPrice;
                $price = $isVip ? $pp->price_per_unit_vip : $pp->price_per_unit_regular;
                return [$price, $itemData['quantity']];

            default:
                throw new \Exception("نوع بيع غير معروف: {$saleType}");
        }
    }

    private function recalculateInvoice(Invoice $invoice): void
    {
        $total      = $invoice->items()->sum('line_total');
        $paidAmount = $invoice->payments()->sum('amount');
        $dueAmount  = $total - $paidAmount;

        $status = match(true) {
            $paidAmount <= 0           => 'unpaid',
            $paidAmount >= $total      => 'paid',
            default                    => 'partial',
        };

        $invoice->update([
            'total'          => $total,
            'paid_amount'    => $paidAmount,
            'due_amount'     => $dueAmount,
            'payment_status' => $status,
        ]);
    }

    private function updateCustomerDebt(Invoice $invoice): void
    {
        if ($invoice->customer_id === 1) return;

        $customer = Customer::find($invoice->customer_id);
        if (!$customer) return;

        // إعادة حساب الدين من كل الفواتير
        $totalDebt = $this->model
            ->where('customer_id', $invoice->customer_id)
            ->sum('due_amount');

        $totalPurchases = $this->model
            ->where('customer_id', $invoice->customer_id)
            ->sum('total');

        $customer->update([
            'total_debt'      => $totalDebt,
            'total_purchases' => $totalPurchases,
        ]);
    }
}
