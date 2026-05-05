<?php

namespace App\Observers;

use App\Models\Payment;
use App\Observers\InvoiceItemObserver;

/**
 * يُحدِّث:
 *  - invoices: paid_amount, due_amount, payment_status (إذا كانت الدفعة مرتبطة بفاتورة)
 *  - customers: total_paid, total_debt
 */
class PaymentObserver
{
    public function created(Payment $payment): void
    {
        $this->syncInvoice($payment);
        $this->syncCustomer($payment);
    }

    public function deleted(Payment $payment): void
    {
        $this->syncInvoice($payment);
        $this->syncCustomer($payment);
    }

    private function syncInvoice(Payment $payment): void
    {
        if (!$payment->invoice_id) return;

        $invoice = \App\Models\Invoice::find($payment->invoice_id);
        if (!$invoice) return;

        $invoice->paid_amount = $invoice->payments()->sum('amount');
        $invoice->due_amount  = $invoice->total - $invoice->paid_amount;

        $invoice->payment_status = match (true) {
            $invoice->paid_amount <= 0               => 'unpaid',
            $invoice->paid_amount >= $invoice->total => 'paid',
            default                                  => 'partial',
        };

        $invoice->saveQuietly();
    }

    private function syncCustomer(Payment $payment): void
    {
        if (!$payment->customer_id || $payment->customer_id === 1) return;

        InvoiceItemObserver::recalculateCustomer($payment->customer_id);
    }
}
