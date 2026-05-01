<?php

namespace App\Repositories\Contracts;

interface WasteRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function findWithRelations(int $id);
    public function createLog(array $data);
    public function addItem(int $logId, array $itemData): void;
    public function removeItem(int $logId, int $itemId): void;
}
