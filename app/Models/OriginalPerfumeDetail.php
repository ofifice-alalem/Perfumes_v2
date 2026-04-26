<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OriginalPerfumeDetail extends Model
{
    protected $fillable = ['product_id', 'bottle_volume'];

    protected $casts = [
        'bottle_volume' => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
