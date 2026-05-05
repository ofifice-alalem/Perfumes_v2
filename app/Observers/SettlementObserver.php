<?php

namespace App\Observers;

use App\Models\Settlement;
use App\Observers\InvoiceItemObserver;

/**
 * يُحدِّث:
 *  - customers: total_settlements, total_debt
 */
class SettlementObserver
{
    public function created(Settlement $settlement): void
    {
        $this->syncCustomer($settlement);
    }

    public function deleted(Settlement $settlement): void
    {
        $this->syncCustomer($settlement);
    }

    private function syncCustomer(Settlement $settlement): void
    {
        if (!$settlement->customer_id || $settlement->customer_id === 1) return;

        InvoiceItemObserver::recalculateCustomer($settlement->customer_id);
    }
}
