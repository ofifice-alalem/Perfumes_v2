<?php

namespace App\Repositories\Contracts;

interface CustomerRepositoryInterface extends BaseRepositoryInterface
{
    public function allOrdered();
    public function allActive();
    public function hasInvoices(int $id): bool;
}
