<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPrice extends Model
{
    protected $fillable = [
        'product_id',
        'price_per_unit_regular', 'price_per_unit_vip',
        'full_bottle_regular', 'full_bottle_vip',
    ];

    protected $casts = [
        'price_per_unit_regular' => 'decimal:2',
        'price_per_unit_vip'     => 'decimal:2',
        'full_bottle_regular'    => 'decimal:2',
        'full_bottle_vip'        => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
