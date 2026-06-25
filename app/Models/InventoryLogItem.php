<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryLogItem extends Model
{
    protected $guarded = [];

    public function inventoryLog(): BelongsTo
    {
        return $this->belongsTo(InventoryLog::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
