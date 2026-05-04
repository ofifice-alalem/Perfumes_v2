<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface SizeRepositoryInterface extends Repository
{
    public function allOrdered();
    public function isUsed(int $id): bool;
}
