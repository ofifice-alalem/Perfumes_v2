<?php

namespace App\Repositories\Contracts;

interface SupplierSettlementRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function filter(array $params);
    public function findWithRelations(int $id);
    public function createSettlement(array $data);
    public function deleteSettlement(int $id): void;
}
