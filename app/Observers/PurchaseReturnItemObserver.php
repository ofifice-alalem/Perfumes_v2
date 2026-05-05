<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\PurchaseReturnItem;

class PurchaseReturnItemObserver
{
    public function created(PurchaseReturnItem $item): void
    {
        // stock -= quantity (returning goods reduces stock)
        Product::where('id', $item->product_id)->decrement('stock', $item->quantity);

        $this->syncReturn($item);
        $this->syncSupplier($item);
    }

    public function deleted(PurchaseReturnItem $item): void
    {
        // stock += quantity (cancelling a return restores stock)
        Product::where('id', $item->product_id)->increment('stock', $item->quantity);

        $this->syncReturn($item);
        $this->syncSupplier($item);
    }

    private function syncReturn(PurchaseReturnItem $item): void
    {
        $return = \App\Models\PurchaseReturn::find($item->purchase_return_id);
        if (!$return) return;

        $return->total = $return->items()->sum('line_total');
        $return->saveQuietly();
    }

    private function syncSupplier(PurchaseReturnItem $item): void
    {
        $return = \App\Models\PurchaseReturn::find($item->purchase_return_id);
        if (!$return || !$return->supplier_id || $return->supplier_id === 1) return;

        PurchaseItemObserver::recalculateSupplier($return->supplier_id);
    }
}
