<?php

namespace App\Repositories\Contracts;

interface CategoryRepositoryInterface extends RepositoryInterface
{
    public function allOrdered();
    public function hasProducts(int $id): bool;
}
