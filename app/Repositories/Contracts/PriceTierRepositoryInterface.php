<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface PriceTierRepositoryInterface extends Repository
{
    public function allWithPrices();
    public function hasProducts(int $id): bool;
    public function syncPrices(int $tierId, array $activePrices, array $allPrices): void;
}
