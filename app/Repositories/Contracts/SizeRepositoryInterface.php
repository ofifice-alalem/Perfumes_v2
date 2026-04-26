<?php

namespace App\Repositories\Contracts;

interface SizeRepositoryInterface extends RepositoryInterface
{
    public function allOrdered();
    public function isUsed(int $id): bool;
}
