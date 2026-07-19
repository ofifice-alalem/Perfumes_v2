<?php

namespace App\Observers;

use App\Models\SupplierSettlement;
use App\Observers\PurchaseItemObserver;

class SupplierSettlementObserver
{
    public function created(SupplierSettlement $settlement): void
    {
        $this->syncPurchaseReturn($settlement);
        $this->syncSupplier($settlement);
    }

    public function deleted(SupplierSettlement $settlement): void
    {
        $this->syncPurchaseReturn($settlement);
        $this->syncSupplier($settlement);
    }

    public function restored(SupplierSettlement $settlement): void
    {
        $this->syncPurchaseReturn($settlement);
        $this->syncSupplier($settlement);
    }

    private function syncPurchaseReturn(SupplierSettlement $settlement): void
    {
        if (!$settlement->purchase_return_id) return;

        $return = \App\Models\PurchaseReturn::find($settlement->purchase_return_id);
        if (!$return) return;

        $return->recovered_amount = $return->settlements()->sum('amount');
        $return->due_recovery     = $return->total - $return->recovered_amount;

        $return->recovery_status = match(true) {
            $return->recovered_amount <= 0            => 'unpaid',
            $return->recovered_amount >= $return->total => 'paid',
            default                                   => 'partial',
        };

        $return->saveQuietly();
    }

    private function syncSupplier(SupplierSettlement $settlement): void
    {
        if (!$settlement->supplier_id || $settlement->supplier_id === 1) return;

        PurchaseItemObserver::recalculateSupplier($settlement->supplier_id);
    }
}
