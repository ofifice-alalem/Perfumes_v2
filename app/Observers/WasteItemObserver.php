<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\WasteItem;

class WasteItemObserver
{
    public function created(WasteItem $item): void
    {
        // stock -= quantity (decrease stock when waste is recorded)
        Product::where('id', $item->product_id)->decrement('stock', $item->quantity);
        \Illuminate\Support\Facades\Cache::forget('pos_products_catalog_base');
    }

    public function updated(WasteItem $item): void
    {
        // Adjust stock based on quantity difference
        $oldQuantity = $item->getOriginal('quantity');
        $newQuantity = $item->quantity;
        $diff = $newQuantity - $oldQuantity;

        if ($diff > 0) {
            // Increased waste quantity → decrease stock more
            Product::where('id', $item->product_id)->decrement('stock', $diff);
            \Illuminate\Support\Facades\Cache::forget('pos_products_catalog_base');
        } elseif ($diff < 0) {
            // Decreased waste quantity → restore some stock
            Product::where('id', $item->product_id)->increment('stock', abs($diff));
            \Illuminate\Support\Facades\Cache::forget('pos_products_catalog_base');
        }
    }

    public function deleted(WasteItem $item): void
    {
        // stock += quantity (restore stock when waste item is deleted)
        Product::where('id', $item->product_id)->increment('stock', $item->quantity);
        \Illuminate\Support\Facades\Cache::forget('pos_products_catalog_base');
    }
}
