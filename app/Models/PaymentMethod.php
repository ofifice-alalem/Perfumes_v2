<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class PaymentMethod extends Model implements Auditable
{
    use AuditableTrait;

    protected $fillable = ['name', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saved(function () {
            \Illuminate\Support\Facades\Cache::forget('pos_payment_methods_list');
            \Illuminate\Support\Facades\Cache::forget('global_payment_methods_list');
        });
        static::deleted(function () {
            \Illuminate\Support\Facades\Cache::forget('pos_payment_methods_list');
            \Illuminate\Support\Facades\Cache::forget('global_payment_methods_list');
        });
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function supplierPayments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function hasRelatedRecords(): bool
    {
        return $this->payments()->exists() || $this->supplierPayments()->exists();
    }
}
