<?php

namespace App\Repositories\Contracts;

interface SupplierRepositoryInterface extends RepositoryInterface
{
    public function allOrdered();
    public function allActive();
    public function hasPurchases(int $id): bool;
}
