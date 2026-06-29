<?php

namespace App\Repositories;

use App\Models\TierPrice;
use App\Repositories\Contracts\PriceTierRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class PriceTierRepository extends Repository implements PriceTierRepositoryInterface
{
    public function allWithPrices()
    {
        return $this->model
            ->with(['tierPrices.size'])
            ->orderBy('name')
            ->get();
    }

    public function hasProducts(int $id): bool
    {
        return $this->find($id)->products()->exists();
    }

    public function syncPrices(int $tierId, array $activePrices, array $allPrices): void
    {
        // Upsert active prices (sizes with actual values)
        foreach ($activePrices as $price) {
            TierPrice::updateOrCreate(
                ['tier_id' => $tierId, 'size_id' => $price['size_id']],
                ['price_regular' => $price['price_regular'] ?? 0, 'price_vip' => $price['price_vip'] ?? 0]
            );
        }

        // Delete prices for sizes that were cleared (empty/zero)
        $activeSizeIds = array_column($activePrices, 'size_id');
        $allSizeIds = array_column($allPrices, 'size_id');
        $clearedSizeIds = array_diff($allSizeIds, $activeSizeIds);

        if (!empty($clearedSizeIds)) {
            TierPrice::where('tier_id', $tierId)
                ->whereIn('size_id', $clearedSizeIds)
                ->delete();
        }
    }
}
