<?php

namespace App\Repositories\Contracts;

interface UserRepositoryInterface extends BaseRepositoryInterface
{
    public function allOrdered();
    public function hasInvoices(int $id): bool;
}
