<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class Supplier extends Model implements Auditable
{
    use AuditableTrait;

    protected $fillable = [
        'name', 'phone', 'email', 'address', 'is_active',
        'total_purchases', 'total_paid', 'total_returns',
        'total_settlements', 'total_debt', 'opening_balance',
    ];

    protected $casts = [
        'total_purchases'   => 'decimal:2',
        'total_paid'        => 'decimal:2',
        'total_returns'     => 'decimal:2',
        'total_settlements' => 'decimal:2',
        'total_debt'        => 'decimal:2',
        'opening_balance'   => 'decimal:2',
        'is_active'         => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::updating(function (self $model) {
            if ($model->id === 1) {
                abort(403, 'لا يمكن تعديل المورد النقدي');
            }
        });

        static::deleting(function (self $model) {
            if ($model->id === 1) {
                abort(403, 'لا يمكن حذف المورد النقدي');
            }
        });
    }

    public function scopeWithoutCash(Builder $query): Builder
    {
        return $query->where('id', '!=', 1);
    }

    public function isCashSupplier(): bool
    {
        return $this->id === 1;
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }
}
