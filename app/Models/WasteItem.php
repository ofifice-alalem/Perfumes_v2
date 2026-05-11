<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Auditable as AuditableTrait;

class WasteItem extends Model implements Auditable
{
    use AuditableTrait;

    public $timestamps = false;

    protected $fillable = [
        'period_id',
        'waste_log_id',
        'product_id',
        'quantity',
        'reason',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'quantity'   => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function wasteLog(): BelongsTo
    {
        return $this->belongsTo(WasteLog::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
