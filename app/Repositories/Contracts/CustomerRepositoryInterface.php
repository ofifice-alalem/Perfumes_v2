<?php

namespace App\Repositories\Contracts;

interface CustomerRepositoryInterface extends RepositoryInterface
{
    public function allOrdered();
    public function allActive();
    public function hasInvoices(int $id): bool;
}
