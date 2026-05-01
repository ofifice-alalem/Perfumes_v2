<?php

namespace App\Repositories\Contracts;

interface ProductRepositoryInterface extends RepositoryInterface
{
    public function allWithRelations();
    public function findWithRelations(int $id);
    public function createTierBased(array $productData): \App\Models\Product;
    public function createUnitPriced(array $productData, ?array $priceData, ?float $bottleVolume): \App\Models\Product;
    public function updateProduct(int $id, array $productData, ?array $priceData, ?float $bottleVolume): void;
    public function isUsed(int $id): bool;
}
