<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\PurchaseItem;

class PurchaseItemObserver
{
    public function created(PurchaseItem $item): void
    {
        // stock += quantity
        Product::where('id', $item->product_id)->increment('stock', $item->quantity);

        $this->syncPurchase($item);
        $this->syncSupplier($item);
    }

    public function updated(PurchaseItem $item): void
    {
        // stock += (new_qty - old_qty)
        $diff = $item->quantity - $item->getOriginal('quantity');
        if ($diff != 0) {
            Product::where('id', $item->product_id)->increment('stock', $diff);
        }

        $this->syncPurchase($item);
        $this->syncSupplier($item);
    }

    public function deleted(PurchaseItem $item): void
    {
        // stock -= quantity
        Product::where('id', $item->product_id)->decrement('stock', $item->quantity);

        $this->syncPurchase($item);
        $this->syncSupplier($item);
    }

    private function syncPurchase(PurchaseItem $item): void
    {
        $purchase = \App\Models\Purchase::find($item->purchase_id);
        if (!$purchase) return;

        $purchase->total      = $purchase->items()->sum('line_total');
        $purchase->due_amount = $purchase->total - $purchase->paid_amount;

        $purchase->payment_status = match (true) {
            $purchase->paid_amount <= 0                => 'unpaid',
            $purchase->paid_amount >= $purchase->total => 'paid',
            default                                    => 'partial',
        };

        $purchase->saveQuietly();
    }

    private function syncSupplier(PurchaseItem $item): void
    {
        $purchase = \App\Models\Purchase::find($item->purchase_id);
        if (!$purchase || !$purchase->supplier_id || $purchase->supplier_id === 1) return;

        self::recalculateSupplier($purchase->supplier_id);
    }

    public static function recalculateSupplier(int $supplierId): void
    {
        $supplier = \App\Models\Supplier::find($supplierId);
        if (!$supplier || $supplier->id === 1) return;

        $supplier->total_purchases   = \App\Models\Purchase::where('supplier_id', $supplierId)->sum('total');
        $supplier->total_paid        = \App\Models\SupplierPayment::where('supplier_id', $supplierId)->sum('amount');
        $supplier->total_returns     = \App\Models\PurchaseReturn::where('supplier_id', $supplierId)->sum('total');
        $supplier->total_settlements = \App\Models\SupplierSettlement::where('supplier_id', $supplierId)->sum('amount');
        $supplier->total_debt        = $supplier->total_purchases
                                     - $supplier->total_paid
                                     + $supplier->total_settlements
                                     - $supplier->total_returns;

        $supplier->saveQuietly();
    }
}
