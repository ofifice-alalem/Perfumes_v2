<?php

namespace App\Repositories\Contracts;

interface InvoiceRepositoryInterface
{
    public function paginated(int $perPage = 5);
    public function findWithRelations(int $id);
    public function createWithItems(array $invoiceData, array $itemsData, array $paymentsData, ?array $debtPaymentData): \App\Models\Invoice;
    public function getRecentInvoicesFormatted(int $limit = 4): array;
    public function getPosCatalog(): array;
    public function getStatusCounts(): array;
}
