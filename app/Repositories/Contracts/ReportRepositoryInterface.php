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
    public function customerAging(?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false, ?int $movementsLimitPerCustomer = 30): array;
    public function loadMoreCustomerMovements(int $customerId, int $offset = 30, int $limit = 30, ?string $dateFrom = null, ?string $dateTo = null, bool $showAllHistory = false): array;
    public function exportCustomerAgingExcel(?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): void;
    public function exportCustomerAgingPdf(?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): \Illuminate\Http\Response;
    public function supplierAging(?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false, ?int $movementsLimitPerSupplier = 30): array;
    public function loadMoreSupplierMovements(int $supplierId, int $offset = 30, int $limit = 30, ?string $dateFrom = null, ?string $dateTo = null, bool $showAllHistory = false): array;
    public function exportSupplierAgingExcel(?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): void;
    public function exportSupplierAgingPdf(?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): \Illuminate\Http\Response;
    public function sales(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, bool $compare = false, ?array $filterProductIds = null, ?string $searchName = null): array;
    public function exportSalesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void;
    public function exportSalesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response;
    public function salesCustomerInvoices(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $invoicesLimitPerCustomer = 30): array;
    public function loadMoreCustomerInvoices(int $customerId, int $offset = 30, int $limit = 30, ?string $dateFrom = null, ?string $dateTo = null, ?int $userId = null, ?int $paymentMethodId = null, ?int $categoryId = null, ?array $filterProductIds = null, ?string $searchName = null): array;
    public function exportSalesCustomerInvoicesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void;
    public function exportSalesCustomerInvoicesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response;
    public function purchases(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, bool $compare = false, ?array $filterProductIds = null, ?string $searchName = null): array;
    public function exportPurchasesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void;
    public function exportPurchasesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response;
    public function purchasesSupplierInvoices(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $invoicesLimitPerSupplier = 30): array;
    public function loadMoreSupplierInvoices(int $supplierId, int $offset = 30, int $limit = 30, ?string $dateFrom = null, ?string $dateTo = null, ?int $userId = null, ?int $categoryId = null, ?array $filterProductIds = null, ?string $searchName = null): array;
    public function exportPurchasesSupplierInvoicesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void;
    public function exportPurchasesSupplierInvoicesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response;
    public function returns(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): array;
    public function exportReturnsExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void;
    public function exportReturnsPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response;
    public function returnsDetails(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): array;
    public function exportReturnsDetailsExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): void;
    public function exportReturnsDetailsPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): \Illuminate\Http\Response;
    public function profitAnalysis(array $productIds, ?string $dateFrom, ?string $dateTo, ?int $categoryId = null): array;
    public function dailyProfitSummary(?string $dateFrom, ?string $dateTo, ?array $filterProductIds = null, ?int $periodId = null, ?string $searchName = null): array;
}
