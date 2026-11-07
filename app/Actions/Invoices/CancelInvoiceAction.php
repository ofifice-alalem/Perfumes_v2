<?php

namespace App\Actions\Invoices;

use App\Models\Invoice;
use App\Models\InventoryLog;
use App\Models\InventoryLogItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Settlement;
use App\Observers\InvoiceItemObserver;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelInvoiceAction
{
    public function __construct(private InvoiceRepositoryInterface $invoices) {}

    public function execute(int $id, bool $deletePayments = false, bool $deleteSettlements = false): void
    {
        $invoice = Invoice::withTrashed()->with('items')->findOrFail($id);

        // Guard: Prevent double cancellation / restoration reversal
        if ($invoice->trashed()) {
            throw ValidationException::withMessages([
                'invoice' => 'الفاتورة ملغاة بالفعل ولا يمكن إعادتها أكثر من مرة.'
            ]);
        }

        $isCash = $invoice->customer_id === 1;
        if ($isCash) {
            $deletePayments = true;
            $deleteSettlements = true;
        }

        DB::transaction(function () use ($invoice, $deletePayments, $deleteSettlements) {
            // 1. Collect product IDs and lock product rows
            $productIds = $invoice->items->pluck('product_id')->unique()->toArray();
            $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

            // 2. Create Inventory Log for Cancellation
            $inventoryLog = InventoryLog::create([
                'user_id' => auth()->id() ?? 1,
                'notes'   => "إلغاء فاتورة مبيعات رقم #{$invoice->id}",
            ]);

            // 3. Restore stock and record reversal logs efficiently
            $groupedQuantities = [];
            foreach ($invoice->items as $item) {
                $pid = (int) $item->product_id;
                $qty = (float) $item->quantity;
                $groupedQuantities[$pid] = ($groupedQuantities[$pid] ?? 0) + $qty;
            }

            $logItems = [];
            $now = now();

            foreach ($groupedQuantities as $pid => $qtyToRestore) {
                $prod = $products->get($pid);
                $stockBefore = $prod ? (float) $prod->stock : 0;
                $stockAfter = $stockBefore + $qtyToRestore;

                Product::where('id', $pid)->increment('stock', $qtyToRestore);

                $logItems[] = [
                    'inventory_log_id' => $inventoryLog->id,
                    'product_id'       => $pid,
                    'system_stock'     => $stockBefore,
                    'actual_stock'     => $stockAfter,
                    'difference'       => $qtyToRestore,
                    'reason'           => "إلغاء فاتورة #{$invoice->id}",
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ];
            }

            if (!empty($logItems)) {
                InventoryLogItem::insert($logItems);
            }

            // 4. Handle dependent Payments & Settlements
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

            // 5. Soft delete invoice
            $invoice->delete();

            // 6. Recalculate customer debt
            if ($invoice->customer_id) {
                InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
            }
        });
    }
}
