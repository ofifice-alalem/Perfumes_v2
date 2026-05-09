<?php

namespace App\Repositories\Contracts;

interface ReportRepositoryInterface
{
    public function productMovement(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): array;
    public function exportProductMovementExcel(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): void;
    public function exportProductMovementPdf(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): \Illuminate\Http\Response;
    public function stockStatus(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold, bool $showWasted): array;
    public function exportStockStatusExcel(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold, bool $showWasted): void;
    public function exportStockStatusPdf(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold, bool $showWasted): \Illuminate\Http\Response;
    public function customerAging(?int $customerId, ?string $dateFrom, ?string $dateTo): array;
    public function exportCustomerAgingExcel(?int $customerId, ?string $dateFrom, ?string $dateTo): void;
    public function exportCustomerAgingPdf(?int $customerId, ?string $dateFrom, ?string $dateTo): \Illuminate\Http\Response;
    public function supplierAging(?int $supplierId, ?string $dateFrom, ?string $dateTo): array;
    public function exportSupplierAgingExcel(?int $supplierId, ?string $dateFrom, ?string $dateTo): void;
    public function exportSupplierAgingPdf(?int $supplierId, ?string $dateFrom, ?string $dateTo): \Illuminate\Http\Response;
    public function sales(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, bool $compare): array;
    public function exportSalesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId): void;
    public function exportSalesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId): \Illuminate\Http\Response;
}
