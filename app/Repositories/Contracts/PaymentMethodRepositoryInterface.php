<?php

namespace App\Repositories\Contracts;

interface PaymentMethodRepositoryInterface extends BaseRepositoryInterface
{
    public function allOrdered();
    public function allActive();
    public function isUsed(int $id): bool;
}
