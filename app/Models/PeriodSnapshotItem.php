<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeriodSnapshotItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'snapshot_id', 'type', 'entity_id', 'entity_name', 'balance', 'created_at',
    ];

    protected $casts = [
        'balance'    => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(PeriodSnapshot::class, 'snapshot_id');
    }
}
