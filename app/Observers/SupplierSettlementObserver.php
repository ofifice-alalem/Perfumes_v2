<?php

namespace App\Observers;

use App\Models\SupplierSettlement;
use App\Observers\PurchaseItemObserver;

/**
 * يُحدِّث:
 *  - suppliers: total_settlements, total_debt
 */
class SupplierSettlementObserver
{
    public function created(SupplierSettlement $settlement): void
    {
        $this->syncSupplier($settlement);
    }

    public function deleted(SupplierSettlement $settlement): void
    {
        $this->syncSupplier($settlement);
    }

    private function syncSupplier(SupplierSettlement $settlement): void
    {
        if (!$settlement->supplier_id || $settlement->supplier_id === 1) return;

        PurchaseItemObserver::recalculateSupplier($settlement->supplier_id);
    }
}
