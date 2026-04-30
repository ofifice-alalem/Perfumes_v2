<?php

namespace App\Repositories\Contracts;

interface SizeRepositoryInterface extends BaseRepositoryInterface
{
    public function allOrdered();
    public function isUsed(int $id): bool;
}
