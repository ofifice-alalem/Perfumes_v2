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
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RestoreInvoiceAction
{
    public function __construct(private InvoiceRepositoryInterface $invoices) {}

    public function execute(int $id): Invoice
    {
        $invoice = Invoice::withTrashed()->with('items')->findOrFail($id);

        // Guard: Prevent restoring an invoice that is already active (double restore protection)
        if (!$invoice->trashed()) {
            throw ValidationException::withMessages([
                'invoice' => 'الفاتورة نشطة بالفعل ولا تطلب استعادة.'
            ]);
        }

        return DB::transaction(function () use ($invoice) {
            // 1. Aggregate required quantities per product
            $productQuantities = [];
            foreach ($invoice->items as $item) {
                $pid = (int) $item->product_id;
                $qty = (float) $item->quantity;
                $productQuantities[$pid] = ($productQuantities[$pid] ?? 0) + $qty;
            }

            // 2. Lock product rows and validate available stock before restore (Negative Stock Protection)
            $products = Product::whereIn('id', array_keys($productQuantities))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($productQuantities as $pid => $requiredQty) {
                $product = $products->get($pid);
                if (!$product) {
                    throw ValidationException::withMessages([
                        'items' => "المنتج غير موجود (رمز: {$pid})"
                    ]);
                }

                if ($product->stock < $requiredQty) {
                    throw ValidationException::withMessages([
                        'items' => "المخزون غير كافٍ لاستعادة الفاتورة للمنتج ({$product->name}). المتاح: " . (float)$product->stock . " ، المطلوب: {$requiredQty}"
                    ]);
                }
            }

            // 3. Record Inventory Log for Restore
            $inventoryLog = InventoryLog::create([
                'user_id' => Auth::id() ?? 1,
                'notes'   => "استعادة فاتورة مبيعات رقم #{$invoice->id}",
            ]);

            // 4. Decrement stock and write Inventory Log Items
            foreach ($invoice->items as $item) {
                $stockBefore = (float) Product::where('id', $item->product_id)->value('stock');
                Product::where('id', $item->product_id)->decrement('stock', $item->quantity);
                $stockAfter = $stockBefore - (float) $item->quantity;

                InventoryLogItem::create([
                    'inventory_log_id' => $inventoryLog->id,
                    'product_id'       => $item->product_id,
                    'system_stock'     => $stockBefore,
                    'actual_stock'     => $stockAfter,
                    'difference'       => -(float) $item->quantity,
                    'reason'           => "استعادة فاتورة #{$invoice->id}",
                ]);
            }

            // 5. Restore invoice record
            $invoice->restore();

            // 6. Restore trashed payments and settlements associated with invoice
            Payment::onlyTrashed()
                ->where('invoice_id', $invoice->id)
                ->restore();

            Settlement::onlyTrashed()
                ->where('invoice_id', $invoice->id)
                ->restore();

            // 7. Recalculate customer debt
            if ($invoice->customer_id) {
                InvoiceItemObserver::recalculateCustomer($invoice->customer_id);
            }

            return $invoice;
        });
    }
}
