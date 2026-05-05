<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class PurchaseReturn extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;

    protected $fillable = ['supplier_id', 'purchase_id', 'settlement_id', 'total', 'recovered_amount', 'due_recovery', 'recovery_status', 'notes'];

    protected $casts = [
        'total'            => 'decimal:2',
        'recovered_amount' => 'decimal:2',
        'due_recovery'     => 'decimal:2',
    ];

    public function recalculate(): void
    {
        $this->recovered_amount = $this->settlements()->sum('amount');
        $this->due_recovery     = $this->total - $this->recovered_amount;

        $this->recovery_status = match(true) {
            $this->recovered_amount <= 0             => 'unpaid',
            $this->recovered_amount >= $this->total  => 'paid',
            default                                  => 'partial',
        };

        $this->save();
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(SupplierSettlement::class, 'settlement_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(SupplierSettlement::class, 'purchase_return_id');
    }
}
