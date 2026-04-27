<?php

namespace App\Repositories\Contracts;

interface UserRepositoryInterface extends RepositoryInterface
{
    public function allOrdered();
    public function hasInvoices(int $id): bool;
}
