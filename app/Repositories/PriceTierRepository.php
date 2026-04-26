<?php

namespace App\Repositories;

use App\Models\PriceTier;
use App\Models\TierPrice;
use App\Repositories\Contracts\PriceTierRepositoryInterface;

class PriceTierRepository extends BaseRepository implements PriceTierRepositoryInterface
{
    public function __construct(PriceTier $model)
    {
        parent::__construct($model);
    }

    public function allWithPrices()
    {
        return $this->model
            ->with(['tierPrices.size'])
            ->orderBy('name')
            ->get();
    }

    public function hasProducts(int $id): bool
    {
        return $this->model->findOrFail($id)->products()->exists();
    }

    public function syncPrices(int $tierId, array $prices): void
    {
        foreach ($prices as $price) {
            TierPrice::updateOrCreate(
                ['tier_id' => $tierId, 'size_id' => $price['size_id']],
                ['price_regular' => $price['price_regular'], 'price_vip' => $price['price_vip']]
            );
        }
    }
}
