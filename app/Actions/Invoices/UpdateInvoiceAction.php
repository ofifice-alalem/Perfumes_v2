<?php

namespace App\Actions\Invoices;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InventoryLog;
use App\Models\InventoryLogItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Size;
use App\Observers\InvoiceItemObserver;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateInvoiceAction
{
    public function __construct(private InvoiceRepositoryInterface $invoices) {}

    public function execute(int $id, array $data, int $customerId): Invoice
    {
        return DB::transaction(function () use ($id, $data, $customerId) {
            $invoice = Invoice::with('items')->findOrFail($id);
            $oldCustomerId = $invoice->customer_id;

            // 1. Gather all affected product IDs (both old items and new items)
            $oldProductQuantities = [];
            foreach ($invoice->items as $oldItem) {
                $pid = (int) $oldItem->product_id;
                $oldProductQuantities[$pid] = ($oldProductQuantities[$pid] ?? 0) + (float) $oldItem->quantity;
            }

            $newProductQuantities = [];
            foreach ($data['items'] as $newItem) {
                $pid = (int) $newItem['product_id'];
                $newProductQuantities[$pid] = ($newProductQuantities[$pid] ?? 0) + (float) $newItem['quantity'];
            }

            $allProductIds = array_values(array_unique(array_merge(
                array_keys($oldProductQuantities),
                array_keys($newProductQuantities)
            )));

            // 2. Lock product rows for Race Condition protection
            $products = Product::with(['productPrice', 'priceTier.tierPrices', 'originalPerfumeDetail'])
                ->whereIn('id', $allProductIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // 3. Check stock availability for products where additional stock is required (netDiff > 0)
            $netDiffs = [];
            foreach ($allProductIds as $pid) {
                $oldQty = $oldProductQuantities[$pid] ?? 0;
                $newQty = $newProductQuantities[$pid] ?? 0;
                $netDiff = $newQty - $oldQty; // positive = additional stock needed
                $netDiffs[$pid] = $netDiff;

                if ($netDiff > 0) {
                    $product = $products->get($pid);
                    if (!$product) {
                        throw ValidationException::withMessages([
                            'items' => "المنتج غير موجود (رمز: {$pid})"
                        ]);
                    }
                    if ($product->stock < $netDiff) {
                        throw ValidationException::withMessages([
                            'items' => "المخزون غير كافٍ للمنتج ({$product->name}). المتاح: " . (float)$product->stock . " ، الإضافي المطلوب: {$netDiff}"
                        ]);
                    }
                }
            }

            // 4. Determine customer & VIP status
            $customer = Customer::findOrFail($customerId);
            $customerType = $data['customer_type'] ?? ($customer->id === 1 ? 'regular' : ($customer->total_debt < 0 ? 'vip' : 'regular'));
            $isVip = $customerType === 'vip';

            // 5. Delete old items (InvoiceItemObserver::deleted restores stock by oldQty)
            foreach ($invoice->items as $oldItem) {
                $oldItem->delete();
            }

            // 6. Update base invoice record
            $invoice->update([
                'customer_id'   => $customerId,
                'customer_type' => $customerType,
                'notes'         => $data['notes'] ?? null,
            ]);

            // 7. Calculate authoritative prices and create new items (InvoiceItemObserver::created decrements stock by newQty)
            $totalInvoiceCents = 0;
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

                $lineTotalCents = (int) round($authoritativeLineTotal * 100);
                $totalInvoiceCents += $lineTotalCents;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $pid,
                    'size_id'    => $sizeId,
                    'sale_type'  => $saleType,
                    'quantity'   => $qty,
                    'unit_price' => number_format($authoritativeUnitPrice, 2, '.', ''),
                    'line_total' => number_format($authoritativeLineTotal, 2, '.', ''),
                ]);
            }

            // 8. Record Inventory Movement Log for all affected products with non-zero diff
            $hasMovement = false;
            foreach ($netDiffs as $pid => $diff) {
                if ($diff != 0) {
                    $hasMovement = true;
                    break;
                }
            }

            if ($hasMovement) {
                $inventoryLog = InventoryLog::create([
                    'user_id' => Auth::id() ?? 1,
                    'notes'   => "تعديل فاتورة مبيعات رقم #{$invoice->id}",
                ]);

                foreach ($netDiffs as $pid => $diff) {
                    if ($diff == 0) continue;

                    $stockAfter = (float) Product::where('id', $pid)->value('stock');
                    $stockBefore = $stockAfter + $diff;

                    InventoryLogItem::create([
                        'inventory_log_id' => $inventoryLog->id,
                        'product_id'       => $pid,
                        'system_stock'     => $stockBefore,
                        'actual_stock'     => $stockAfter,
                        'difference'       => -$diff,
                        'reason'           => "تعديل فاتورة #{$invoice->id}",
                    ]);
                }
            }

            // 9. Synchronize Payments
            $totalPaidCents = 0;
            $existingPayments = Payment::where('invoice_id', $invoice->id)->get();
            $newPaymentsList = $data['payments'] ?? [];

            foreach ($newPaymentsList as $paymentData) {
                $amount = (float) $paymentData['amount'];
                if ($amount <= 0) continue;

                $paymentCents = (int) round($amount * 100);
                $totalPaidCents += $paymentCents;

                $existing = $existingPayments->firstWhere('payment_method_id', $paymentData['payment_method_id']);
                if ($existing) {
                    $existing->update([
                        'amount' => number_format($amount, 2, '.', ''),
                        'notes'  => $paymentData['notes'] ?? null,
                    ]);
                    $existingPayments = $existingPayments->reject(fn($p) => $p->id === $existing->id);
                } else {
                    Payment::create([
                        'customer_id'       => $customerId,
                        'user_id'           => Auth::id(),
                        'invoice_id'        => $invoice->id,
                        'payment_method_id' => $paymentData['payment_method_id'],
                        'amount'            => number_format($amount, 2, '.', ''),
                        'notes'             => $paymentData['notes'] ?? null,
                        'created_at'        => now(),
                    ]);
                }
            }

            foreach ($existingPayments as $oldPayment) {
                $oldPayment->delete();
            }

            // 10. Save updated invoice totals using exact integer cent math
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

            // 11. Recalculate customer debt
            if ($oldCustomerId && $oldCustomerId !== $customerId) {
                InvoiceItemObserver::recalculateCustomer($oldCustomerId);
            }
            if ($customerId) {
                InvoiceItemObserver::recalculateCustomer($customerId);
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
