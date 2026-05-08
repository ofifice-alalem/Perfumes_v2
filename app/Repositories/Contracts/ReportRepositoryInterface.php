<?php

namespace App\Repositories\Contracts;

interface ReportRepositoryInterface
{
    public function productMovement(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): array;
    public function exportProductMovementExcel(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): void;
    public function exportProductMovementPdf(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): \Illuminate\Http\Response;
    public function stockStatus(?int $categoryId, ?string $sellingType, bool $lowStockOnly): array;
    public function exportStockStatusExcel(?int $categoryId, ?string $sellingType, bool $lowStockOnly): void;
    public function exportStockStatusPdf(?int $categoryId, ?string $sellingType, bool $lowStockOnly): \Illuminate\Http\Response;
}
