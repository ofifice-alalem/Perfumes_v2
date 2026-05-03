<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'name', 'phone', 'email', 'address',
        'total_purchases', 'total_debt', 'is_active',
    ];

    protected $casts = [
        'total_purchases' => 'decimal:2',
        'total_debt'      => 'decimal:2',
        'is_active'       => 'boolean',
    ];

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function supplierPayments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function supplierSettlements(): HasMany
    {
        return $this->hasMany(SupplierSettlement::class);
    }
}
