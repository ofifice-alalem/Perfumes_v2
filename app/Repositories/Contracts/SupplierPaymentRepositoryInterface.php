<?php

namespace App\Repositories\Contracts;

interface SupplierPaymentRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function filter(array $params);
    public function findWithRelations(int $id);
    public function createPayment(array $data);
    public function deletePayment(int $id): void;
}
