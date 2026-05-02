<?php

namespace App\Repositories\Contracts;

interface InvoiceRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function filter(array $params);
    public function findWithRelations(int $id);
    public function createInvoice(array $data): \App\Models\Invoice;
    public function addItem(int $invoiceId, array $itemData): void;
    public function updateItemCount(int $invoiceId, int $itemId, int $newCount): void;
    public function removeItem(int $invoiceId, int $itemId): void;
    public function addPayment(int $invoiceId, array $paymentData): void;
    public function updateCustomerDebt(?int $customerId): void;
}
