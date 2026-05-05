<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Purchase extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = [
        'supplier_id', 'total', 'paid_amount',
        'due_amount', 'payment_status', 'notes',
    ];

    protected $casts = [
        'total'       => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'due_amount'  => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(SupplierSettlement::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class);
    }

    public function recalculate(): void
    {
        $this->total       = $this->items()->sum('line_total');
        $this->paid_amount = $this->payments()->sum('amount');
        $this->due_amount  = $this->total - $this->paid_amount;

        $this->payment_status = match(true) {
            $this->paid_amount <= 0            => 'unpaid',
            $this->paid_amount >= $this->total => 'paid',
            default                            => 'partial',
        };

        $this->save();
    }
}
