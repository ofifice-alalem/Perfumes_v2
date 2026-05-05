<?php

namespace App\Observers;

use App\Models\SupplierPayment;
use App\Observers\PurchaseItemObserver;

/**
 * يُحدِّث:
 *  - purchases: paid_amount, due_amount, payment_status (إذا كانت الدفعة مرتبطة بفاتورة)
 *  - suppliers: total_paid, total_debt
 */
class SupplierPaymentObserver
{
    public function created(SupplierPayment $payment): void
    {
        $this->syncPurchase($payment);
        $this->syncSupplier($payment);
    }

    public function deleted(SupplierPayment $payment): void
    {
        $this->syncPurchase($payment);
        $this->syncSupplier($payment);
    }

    private function syncPurchase(SupplierPayment $payment): void
    {
        if (!$payment->purchase_id) return;

        $purchase = \App\Models\Purchase::find($payment->purchase_id);
        if (!$purchase) return;

        $purchase->paid_amount = $purchase->payments()->sum('amount');
        $purchase->due_amount  = $purchase->total - $purchase->paid_amount;

        $purchase->payment_status = match (true) {
            $purchase->paid_amount <= 0                => 'unpaid',
            $purchase->paid_amount >= $purchase->total => 'paid',
            default                                    => 'partial',
        };

        $purchase->saveQuietly();
    }

    private function syncSupplier(SupplierPayment $payment): void
    {
        if (!$payment->supplier_id || $payment->supplier_id === 1) return;

        PurchaseItemObserver::recalculateSupplier($payment->supplier_id);
    }
}
