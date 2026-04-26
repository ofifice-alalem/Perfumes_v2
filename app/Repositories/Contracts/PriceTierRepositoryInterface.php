<?php

namespace App\Repositories\Contracts;

interface PriceTierRepositoryInterface extends RepositoryInterface
{
    public function allWithPrices();
    public function hasProducts(int $id): bool;
    public function syncPrices(int $tierId, array $prices): void;
}
