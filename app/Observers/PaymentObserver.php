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

    public function updated(Payment $payment): void
    {
        if ($payment->wasChanged(['amount', 'invoice_id', 'customer_id'])) {
            $this->syncInvoice($payment);
            $this->syncCustomer($payment);
        }
    }

    public function deleted(Payment $payment): void
    {
        $this->syncInvoice($payment);
        $this->syncCustomer($payment);
    }

    public function restored(Payment $payment): void
    {
        $this->syncInvoice($payment);
        $this->syncCustomer($payment);
    }

    public static bool $muteSync = false;

    public static function withoutSyncing(callable $callback): mixed
    {
        static::$muteSync = true;
        try {
            return $callback();
        } finally {
            static::$muteSync = false;
        }
    }

    private function syncInvoice(Payment $payment): void
    {
        if (static::$muteSync) return;

        if (!$payment->invoice_id) return;

        $invoice = \App\Models\Invoice::find($payment->invoice_id);
        if (!$invoice) return;

        $invoice->paid_amount = \App\Models\Payment::where('invoice_id', $invoice->id)->sum('amount');
        $invoice->due_amount  = max(0, $invoice->total - $invoice->paid_amount);

        $invoice->payment_status = match (true) {
            $invoice->paid_amount <= 0               => 'unpaid',
            $invoice->paid_amount >= $invoice->total => 'paid',
            default                                  => 'partial',
        };

        $invoice->saveQuietly();
    }

    private function syncCustomer(Payment $payment): void
    {
        if (static::$muteSync) return;

        if (!$payment->customer_id) return;

        InvoiceItemObserver::recalculateCustomer($payment->customer_id);
    }
}
