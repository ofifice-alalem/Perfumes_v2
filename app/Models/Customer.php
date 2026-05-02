<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
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

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(Settlement::class);
    }

    public function isCashCustomer(): bool
    {
        return $this->id === 1;
    }
}
