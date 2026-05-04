<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface CategoryRepositoryInterface extends Repository
{
    public function allOrdered();
    public function hasProducts(int $id): bool;
}
