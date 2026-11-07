<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface ProductRepositoryInterface extends Repository
{
    public function paginated(int $perPage = 20);
    public function getFilteredProductsForPrint();
    public function getMissingQrcodesCount(): int;
    public function allWithRelations(array $filters = []);
    public function findWithRelations(int $id);
    public function createWithRelations(array $data);
    public function updateWithRelations(int $id, array $data);
    public function isUsed(int $id): bool;
    public function exportCatalogExcel(?array $productIds = null): void;
    public function importCatalogExcel(\Illuminate\Http\UploadedFile $file, string $mode = 'add_only'): array;
    public function generateMissingQrcodes(): int;
}
