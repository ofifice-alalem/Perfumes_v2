<?php

namespace App\Observers;

use App\Models\Settlement;
use App\Observers\InvoiceItemObserver;

/**
 * يُحدِّث:
 *  - invoice_returns: recovered_amount, due_recovery, recovery_status (if linked)
 *  - customers: total_settlements, total_debt
 */
class SettlementObserver
{
    public function created(Settlement $settlement): void
    {
        $this->syncInvoiceReturn($settlement);
        $this->syncCustomer($settlement);
    }

    public function updated(Settlement $settlement): void
    {
        if ($settlement->wasChanged(['amount', 'invoice_return_id', 'customer_id'])) {
            $this->syncInvoiceReturn($settlement);
            $this->syncCustomer($settlement);
        }
    }

    public function deleted(Settlement $settlement): void
    {
        $this->syncInvoiceReturn($settlement);
        $this->syncCustomer($settlement);
    }

    public function restored(Settlement $settlement): void
    {
        $this->syncInvoiceReturn($settlement);
        $this->syncCustomer($settlement);
    }

    private function syncInvoiceReturn(Settlement $settlement): void
    {
        if (!$settlement->invoice_return_id) return;

        $return = \App\Models\InvoiceReturn::find($settlement->invoice_return_id);
        if (!$return) return;

        $return->recovered_amount = \App\Models\Settlement::where('invoice_return_id', $return->id)->sum('amount');
        $return->due_recovery     = $return->total - $return->recovered_amount;

        $return->recovery_status = match(true) {
            $return->recovered_amount <= 0            => 'unpaid',
            $return->recovered_amount >= $return->total => 'paid',
            default                                   => 'partial',
        };

        $return->saveQuietly();
    }

    private function syncCustomer(Settlement $settlement): void
    {
        if (!$settlement->customer_id) return;

        InvoiceItemObserver::recalculateCustomer($settlement->customer_id);
    }
}
