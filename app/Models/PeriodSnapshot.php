<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PeriodSnapshot extends Model
{
    public $timestamps = false;

    protected $fillable = ['period_id', 'snapshot_at', 'created_by', 'notes', 'created_at'];

    protected $casts = [
        'snapshot_at' => 'datetime',
        'created_at'  => 'datetime',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(AccountingPeriod::class, 'period_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PeriodSnapshotItem::class, 'snapshot_id');
    }

    public function dailyProfits(): HasMany
    {
        return $this->hasMany(PeriodSnapshotDailyProfit::class, 'snapshot_id');
    }

    public function stockProfits(): HasMany
    {
        return $this->hasMany(PeriodSnapshotStockProfit::class, 'snapshot_id');
    }
}
