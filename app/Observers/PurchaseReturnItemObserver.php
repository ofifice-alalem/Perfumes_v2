<?php

namespace App\Observers;

use App\Models\PurchaseReturnItem;
use App\Observers\PurchaseItemObserver;

/**
 * يُحدِّث:
 *  - purchase_returns: total
 *  - suppliers: total_returns, total_debt
 */
class PurchaseReturnItemObserver
{
    public function created(PurchaseReturnItem $item): void
    {
        $this->syncReturn($item);
        $this->syncSupplier($item);
    }

    public function deleted(PurchaseReturnItem $item): void
    {
        $this->syncReturn($item);
        $this->syncSupplier($item);
    }

    private function syncReturn(PurchaseReturnItem $item): void
    {
        $return = $item->purchaseReturn ?? \App\Models\PurchaseReturn::find($item->purchase_return_id);
        if (!$return) return;

        $return->total = $return->items()->sum('line_total');
        $return->saveQuietly();
    }

    private function syncSupplier(PurchaseReturnItem $item): void
    {
        $return = $item->purchaseReturn ?? \App\Models\PurchaseReturn::find($item->purchase_return_id);
        if (!$return || !$return->supplier_id || $return->supplier_id === 1) return;

        PurchaseItemObserver::recalculateSupplier($return->supplier_id);
    }
}
