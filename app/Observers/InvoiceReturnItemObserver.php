<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\InvoiceReturnItem;
use App\Observers\InvoiceItemObserver;

/**
 * يُحدِّث:
 *  - products: stock (increase on return, decrease on deletion)
 *  - invoice_returns: total
 *  - customers: total_returns, total_debt
 */
class InvoiceReturnItemObserver
{
    public function created(InvoiceReturnItem $item): void
    {
        // stock += quantity (customer returning goods increases stock)
        Product::where('id', $item->product_id)->increment('stock', $item->quantity);

        $this->syncReturn($item);
        $this->syncCustomer($item);
    }

    public function deleted(InvoiceReturnItem $item): void
    {
        // stock -= quantity (cancelling a return decreases stock)
        Product::where('id', $item->product_id)->decrement('stock', $item->quantity);

        $this->syncReturn($item);
        $this->syncCustomer($item);
    }

    private function syncReturn(InvoiceReturnItem $item): void
    {
        $return = $item->invoiceReturn ?? \App\Models\InvoiceReturn::find($item->invoice_return_id);
        if (!$return) return;

        $return->total = $return->items()->sum('line_total');
        $return->saveQuietly();
    }

    private function syncCustomer(InvoiceReturnItem $item): void
    {
        $return = $item->invoiceReturn ?? \App\Models\InvoiceReturn::find($item->invoice_return_id);
        if (!$return || !$return->customer_id || $return->customer_id === 1) return;

        InvoiceItemObserver::recalculateCustomer($return->customer_id);
    }
}
