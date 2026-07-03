<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeriodSnapshotStockProfit extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'snapshot_id',
        'product_id',
        'product_name',
        'category_name',
        'unit',
        'stock',
        'total_purchased',
        'total_sold',
        'total_wasted',
        'total_return_in',
        'avg_return_in_price',
        'total_return_out',
        'avg_return_out_price',
        'net_sale_qty',
        'avg_purchase_cost',
        'avg_sale_price',
        'profit',
    ];

    protected $casts = [
        'stock' => 'float',
        'total_purchased' => 'float',
        'total_sold' => 'float',
        'total_wasted' => 'float',
        'total_return_in' => 'float',
        'avg_return_in_price' => 'float',
        'total_return_out' => 'float',
        'avg_return_out_price' => 'float',
        'net_sale_qty' => 'float',
        'avg_purchase_cost' => 'float',
        'avg_sale_price' => 'float',
        'profit' => 'float',
    ];

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(PeriodSnapshot::class);
    }
}
