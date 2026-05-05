<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Settlement extends Model
{
    public $timestamps = false;

    protected $fillable = ['customer_id', 'invoice_id', 'payment_method_id', 'amount', 'notes'];

    protected $casts = [
        'amount'     => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function invoiceReturns(): HasMany
    {
        return $this->hasMany(InvoiceReturn::class);
    }
}
