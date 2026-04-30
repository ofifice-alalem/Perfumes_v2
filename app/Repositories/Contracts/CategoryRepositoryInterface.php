<?php

namespace App\Repositories\Contracts;

interface CategoryRepositoryInterface extends BaseRepositoryInterface
{
    public function allOrdered();
    public function hasProducts(int $id): bool;
}
