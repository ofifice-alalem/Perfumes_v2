<?php

namespace App\Repositories\Contracts;

interface SupplierRepositoryInterface extends BaseRepositoryInterface
{
    public function allActive();
    public function allOrdered();
    public function hasPurchases(int $id): bool;
    public function updateDebt(int $id, float $amount): void;
}