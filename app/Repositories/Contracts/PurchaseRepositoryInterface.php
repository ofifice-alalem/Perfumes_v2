<?php

namespace App\Repositories\Contracts;

interface PurchaseRepositoryInterface extends BaseRepositoryInterface
{
    public function allWithRelations();
    public function findWithRelations(int $id);
    public function createPurchase(array $data);
    public function addItem(int $purchaseId, array $data);
    public function removeItem(int $purchaseId, int $itemId);
    public function addPayment(int $purchaseId, array $data);
}