<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeriodSnapshotDailyProfit extends Model
{
    public $timestamps = false;

    protected $fillable = ['snapshot_id', 'date', 'sales', 'returns', 'net_sales', 'profit'];

    protected $casts = ['date' => 'date:Y-m-d'];

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(PeriodSnapshot::class);
    }
}
