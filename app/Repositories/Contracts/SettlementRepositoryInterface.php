<?php

namespace App\Repositories\Contracts;

interface SettlementRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function filter(array $params);
    public function findWithRelations(int $id);
    public function createSettlement(array $data): \App\Models\Settlement;
}
