<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceReturnItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['invoice_return_id', 'product_id', 'quantity', 'unit_price', 'line_total'];

    protected $casts = [
        'quantity'   => 'decimal:2',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function invoiceReturn(): BelongsTo
    {
        return $this->belongsTo(InvoiceReturn::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
