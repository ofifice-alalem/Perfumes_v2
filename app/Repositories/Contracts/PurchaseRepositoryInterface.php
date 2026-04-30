<?php

namespace App\Repositories\Contracts;

interface PurchaseRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function findWithRelations(int $id);
    public function createPurchase(array $data);
    public function addItem(int $purchaseId, array $itemData): void;
    public function updateItem(int $purchaseId, int $itemId, array $data): void;
    public function removeItem(int $purchaseId, int $itemId): void;
    public function addPayment(int $purchaseId, array $paymentData): void;
}
