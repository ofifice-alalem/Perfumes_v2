<?php

namespace App\Repositories\Contracts;

interface PaymentMethodRepositoryInterface extends RepositoryInterface
{
    public function allOrdered();
    public function allActive();
    public function isUsed(int $id): bool;
}
