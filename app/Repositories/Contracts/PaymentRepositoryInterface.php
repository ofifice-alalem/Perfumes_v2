<?php

namespace App\Repositories\Contracts;

interface PaymentRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function filter(array $params);
    public function findWithRelations(int $id);
    public function createPayment(array $data): \App\Models\Payment;
}
