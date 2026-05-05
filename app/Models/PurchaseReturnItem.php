<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseReturnItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['purchase_return_id', 'product_id', 'quantity', 'unit_cost', 'line_total'];

    protected $casts = [
        'quantity'   => 'decimal:2',
        'unit_cost'  => 'decimal:2',
        'line_total' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function purchaseReturn(): BelongsTo
    {
        return $this->belongsTo(PurchaseReturn::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
