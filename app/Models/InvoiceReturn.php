<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class InvoiceReturn extends Model implements Auditable
{
    use AuditableTrait, SoftDeletes;
    protected $fillable = ['period_id', 'customer_id', 'user_id', 'invoice_id', 'settlement_id', 'total', 'recovered_amount', 'due_recovery', 'recovery_status', 'notes'];

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

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(Settlement::class);
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(Settlement::class, 'invoice_return_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceReturnItem::class);
    }
}
