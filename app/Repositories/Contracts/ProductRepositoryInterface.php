<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface ProductRepositoryInterface extends Repository
{
    public function allWithRelations(array $filters = []);
    public function findWithRelations(int $id);
    public function createWithRelations(array $data);
    public function updateWithRelations(int $id, array $data);
    public function isUsed(int $id): bool;
}
