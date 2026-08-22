<?php

namespace App\Actions\Invoices;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Size;
use App\Observers\InvoiceItemObserver;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateInvoiceAction
{
    public function __construct(private InvoiceRepositoryInterface $invoices) {}

    public function execute(array $data, int $customerId): Invoice
    {
        return DB::transaction(function () use ($data, $customerId) {
            $customer = Customer::findOrFail($customerId);
            $customerType = $data['customer_type'] ?? ($customer->id === 1 ? 'regular' : ($customer->total_debt < 0 ? 'vip' : 'regular'));
            $isVip = $customerType === 'vip';

            // 1. Aggregate requested quantities per product to prevent overdrawing stock when a product is repeated
            $productQuantities = [];
            foreach ($data['items'] as $item) {
                $pid = (int) $item['product_id'];
                $qty = (float) $item['quantity'];
                $productQuantities[$pid] = ($productQuantities[$pid] ?? 0) + $qty;
            }

            // 2. Lock product rows using lockForUpdate() for Race Condition protection
            $products = Product::with(['productPrice', 'priceTier.tierPrices', 'originalPerfumeDetail'])
                ->whereIn('id', array_keys($productQuantities))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // 3. Strict stock availability validation before any modification (Negative Stock Protection)
            foreach ($productQuantities as $pid => $totalRequestedQty) {
                $product = $products->get($pid);
                if (!$product) {
                    throw ValidationException::withMessages([
                        'items' => "المنتج غير موجود (رمز: {$pid})"
                    ]);
                }

                if ($product->stock < $totalRequestedQty) {
                    throw ValidationException::withMessages([
                        'items' => "المخزون غير كافٍ للمنتج ({$product->name}). المتاح: " . (float)$product->stock . " ، المطلوب: {$totalRequestedQty}"
                    ]);
                }
            }

            // 4. Prepare base invoice data
            $invoiceData = [
                'user_id'         => Auth::id() ?? 1,
                'customer_id'     => $customerId,
                'customer_type'   => $customerType,
                'total'           => 0,
                'paid_amount'     => 0,
                'due_amount'      => 0,
                'payment_status'  => 'unpaid',
                'notes'           => $data['notes'] ?? null,
            ];

            // 5. Calculate authoritative prices and prepare items data using integer cent calculations
            $totalInvoiceCents = 0;
            $itemsData = [];

            foreach ($data['items'] as $item) {
                $pid      = (int) $item['product_id'];
                $product  = $products->get($pid);
                $qty      = (float) $item['quantity'];
                $saleType = $item['sale_type'];
                $sizeId   = !empty($item['size_id']) && is_numeric($item['size_id']) ? (int) $item['size_id'] : null;

                // Server-side authoritative price calculation (Fix #1: Never Trust Client Prices)
                [$authoritativeUnitPrice, $authoritativeLineTotal] = $this->calculateAuthoritativePrices(
                    $product,
                    $saleType,
                    $sizeId,
                    $qty,
                    $isVip
                );

                // Integer cent money calculation (Fix #4: Integer Cent Money Calculations)
                $lineTotalCents = (int) round($authoritativeLineTotal * 100);
                $totalInvoiceCents += $lineTotalCents;

                $itemsData[] = [
                    'product_id' => $pid,
                    'size_id'    => $sizeId,
                    'sale_type'  => $saleType,
                    'quantity'   => $qty,
                    'unit_price' => number_format($authoritativeUnitPrice, 2, '.', ''),
                    'line_total' => number_format($authoritativeLineTotal, 2, '.', ''),
                ];
            }

            // 6. Prepare payments data
            $totalPaidCents = 0;
            $paymentsData = [];

            foreach ($data['payments'] ?? [] as $payment) {
                $amount = (float) $payment['amount'];
                if ($amount <= 0) continue;

                $paymentCents = (int) round($amount * 100);
                $totalPaidCents += $paymentCents;

                $paymentsData[] = [
                    'customer_id'       => $customerId,
                    'user_id'           => Auth::id(),
                    'payment_method_id' => $payment['payment_method_id'],
                    'amount'            => number_format($amount, 2, '.', ''),
                    'notes'             => $payment['notes'] ?? null,
                    'created_at'        => now(),
                ];
            }

            // 7. Prepare independent debt payment if provided
            $debtPaymentData = null;
            if (!empty($data['debt_payment']) && $customerId) {
                $dp = $data['debt_payment'];
                $dpAmount = (float) $dp['amount'];
                if ($dpAmount > 0) {
                    $debtPaymentData = [
                        'customer_id'       => $customerId,
                        'user_id'           => Auth::id(),
                        'invoice_id'        => null,
                        'payment_method_id' => $dp['payment_method_id'],
                        'amount'            => number_format($dpAmount, 2, '.', ''),
                        'notes'             => 'سداد دين',
                        'created_at'        => now(),
                    ];
                }
            }

            // 8. Persist Invoice, Items, and Payments through Repository contract without redundant per-item or per-payment syncs
            $invoice = InvoiceItemObserver::withoutSyncing(
                fn() => \App\Observers\PaymentObserver::withoutSyncing(
                    fn() => $this->invoices->createWithItems(
                        $invoiceData,
                        $itemsData,
                        $paymentsData,
                        $debtPaymentData
                    )
                )
            );

            // 8b. Record Inventory Movement Log (Phase 3 Requirement)
            $inventoryLog = \App\Models\InventoryLog::create([
                'user_id' => Auth::id() ?? 1,
                'notes'   => "فاتورة مبيعات رقم #{$invoice->id}",
            ]);

            $logItems = [];
            $now = now();
            foreach ($itemsData as $itemData) {
                $pid = $itemData['product_id'];
                $qty = (float) $itemData['quantity'];
                $prod = $products->get($pid);
                $stockBefore = $prod ? (float)$prod->stock : 0;
                $stockAfter = $stockBefore - $qty;

                $logItems[] = [
                    'inventory_log_id' => $inventoryLog->id,
                    'product_id'       => $pid,
                    'system_stock'     => $stockBefore,
                    'actual_stock'     => $stockAfter,
                    'difference'       => -$qty,
                    'reason'           => "بيع فاتورة #{$invoice->id}",
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ];
            }
            if (!empty($logItems)) {
                \App\Models\InventoryLogItem::insert($logItems);
            }

            // 9. Update final invoice totals & status using exact cent math
            $dueCents = max(0, $totalInvoiceCents - $totalPaidCents);

            $invoice->total          = number_format($totalInvoiceCents / 100, 2, '.', '');
            $invoice->paid_amount    = number_format($totalPaidCents / 100, 2, '.', '');
            $invoice->due_amount     = number_format($dueCents / 100, 2, '.', '');
            $invoice->payment_status = match (true) {
                $totalPaidCents <= 0                  => 'unpaid',
                $totalPaidCents >= $totalInvoiceCents => 'paid',
                default                               => 'partial',
            };
            $invoice->save();

            // 10. Recalculate customer debt
            if ($invoice->customer_id) {
                InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
            }

            return $invoice;
        });
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
}
