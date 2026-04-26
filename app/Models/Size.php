<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Size extends Model
{
    protected $fillable = ['label', 'value', 'unit'];

    protected $casts = [
        'value' => 'decimal:2',
    ];

    public function tierPrices(): HasMany
    {
        return $this->hasMany(TierPrice::class);
    }

    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }
}
