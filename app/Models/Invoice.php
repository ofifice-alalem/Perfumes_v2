<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Invoice extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;
    protected $fillable = [
        'user_id', 'customer_id', 'customer_type',
        'total', 'paid_amount', 'due_amount',
        'payment_status', 'notes',
    ];

    protected $casts = [
        'total'        => 'decimal:2',
        'paid_amount'  => 'decimal:2',
        'due_amount'   => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(Settlement::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(InvoiceReturn::class);
    }

    public function recalculate(): void
    {
        $this->total       = $this->items()->sum('line_total');
        $this->paid_amount = $this->payments()->sum('amount');
        $this->due_amount  = $this->total - $this->paid_amount;

        $this->payment_status = match(true) {
            $this->paid_amount <= 0              => 'unpaid',
            $this->paid_amount >= $this->total   => 'paid',
            default                              => 'partial',
        };

        $this->save();
    }
}
