<?php

namespace App\Observers;

use App\Models\InvoiceItem;

/**
 * يُحدِّث:
 *  - invoices: total, due_amount, payment_status
 *  - customers: total_purchases, total_debt
 */
class InvoiceItemObserver
{
    public function created(InvoiceItem $item): void
    {
        $this->syncInvoice($item);
        $this->syncCustomer($item);
    }

    public function updated(InvoiceItem $item): void
    {
        $this->syncInvoice($item);
        $this->syncCustomer($item);
    }

    public function deleted(InvoiceItem $item): void
    {
        $this->syncInvoice($item);
        $this->syncCustomer($item);
    }

    private function syncInvoice(InvoiceItem $item): void
    {
        $invoice = $item->invoice ?? \App\Models\Invoice::find($item->invoice_id);
        if (!$invoice) return;

        $invoice->total      = $invoice->items()->sum('line_total');
        $invoice->due_amount = $invoice->total - $invoice->paid_amount;

        $invoice->payment_status = match (true) {
            $invoice->paid_amount <= 0               => 'unpaid',
            $invoice->paid_amount >= $invoice->total => 'paid',
            default                                  => 'partial',
        };

        $invoice->saveQuietly();
    }

    private function syncCustomer(InvoiceItem $item): void
    {
        $invoice = $item->invoice ?? \App\Models\Invoice::find($item->invoice_id);
        if (!$invoice || !$invoice->customer_id || $invoice->customer_id === 1) return;

        $this->recalculateCustomer($invoice->customer_id);
    }

    public static function recalculateCustomer(int $customerId): void
    {
        $customer = \App\Models\Customer::find($customerId);
        if (!$customer || $customer->id === 1) return;

        $customer->total_purchases  = \App\Models\Invoice::where('customer_id', $customerId)->sum('total');
        $customer->total_paid       = \App\Models\Payment::where('customer_id', $customerId)->sum('amount');
        $customer->total_returns    = \App\Models\InvoiceReturn::where('customer_id', $customerId)->sum('total');
        $customer->total_settlements = \App\Models\Settlement::where('customer_id', $customerId)->sum('amount');
        $customer->total_debt       = $customer->total_purchases
                                    - $customer->total_paid
                                    + $customer->total_settlements
                                    - $customer->total_returns;

        $customer->saveQuietly();
    }
}
