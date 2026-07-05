<?php

namespace App\Repositories\Contracts;

interface ReportRepositoryInterface
{
    public function productMovement(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): array;
    public function exportProductMovementExcel(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): void;
    public function exportProductMovementPdf(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): \Illuminate\Http\Response;
    public function stockStatus(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold, bool $showWasted, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, ?array $filterProductIds = null, ?int $periodId = null, ?string $searchName = null): array;
    public function exportStockStatusExcel(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, bool $compactView = false, ?array $filterProductIds = null, ?string $searchName = null): void;
    public function exportStockStatusPdf(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, bool $compactView = false, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response;
    public function exportInventoryCountExcel(?int $categoryId, ?string $sellingType, bool $lowStockOnly): void;
    public function exportInventoryCountPdf(?int $categoryId, ?string $sellingType, bool $lowStockOnly): \Illuminate\Http\Response;
    public function customerAging(?int $customerId, ?string $dateFrom, ?string $dateTo): array;
    public function exportCustomerAgingExcel(?int $customerId, ?string $dateFrom, ?string $dateTo): void;
    public function exportCustomerAgingPdf(?int $customerId, ?string $dateFrom, ?string $dateTo): \Illuminate\Http\Response;
    public function supplierAging(?int $supplierId, ?string $dateFrom, ?string $dateTo): array;
    public function exportSupplierAgingExcel(?int $supplierId, ?string $dateFrom, ?string $dateTo): void;
    public function exportSupplierAgingPdf(?int $supplierId, ?string $dateFrom, ?string $dateTo): \Illuminate\Http\Response;
    public function sales(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, bool $compare): array;
    public function exportSalesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId): void;
    public function exportSalesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId): \Illuminate\Http\Response;
    public function salesCustomerInvoices(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId): array;
    public function exportSalesCustomerInvoicesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId): void;
    public function exportSalesCustomerInvoicesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId): \Illuminate\Http\Response;
    public function purchases(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, bool $compare): array;
    public function exportPurchasesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId): void;
    public function exportPurchasesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId): \Illuminate\Http\Response;
    public function purchasesSupplierInvoices(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId): array;
    public function exportPurchasesSupplierInvoicesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId): void;
    public function exportPurchasesSupplierInvoicesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId): \Illuminate\Http\Response;
    public function returns(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId): array;
    public function exportReturnsExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId): void;
    public function exportReturnsPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId): \Illuminate\Http\Response;
    public function returnsDetails(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type): array;
    public function exportReturnsDetailsExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type): void;
    public function exportReturnsDetailsPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type): \Illuminate\Http\Response;
    public function profitAnalysis(array $productIds, ?string $dateFrom, ?string $dateTo, ?int $categoryId = null): array;
    public function dailyProfitSummary(?string $dateFrom, ?string $dateTo, ?array $filterProductIds = null, ?int $periodId = null): array;
}
