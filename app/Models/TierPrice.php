<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TierPrice extends Model
{
    protected $fillable = ['tier_id', 'size_id', 'price_regular', 'price_vip'];

    protected $casts = [
        'price_regular' => 'decimal:2',
        'price_vip'     => 'decimal:2',
    ];

    public function tier(): BelongsTo
    {
        return $this->belongsTo(PriceTier::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }
}
