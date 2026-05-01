<?php

namespace App\Repositories;

use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\OriginalPerfumeDetail;
use App\Repositories\Contracts\ProductRepositoryInterface;

class ProductRepository extends BaseRepository implements ProductRepositoryInterface
{
    public function __construct(Product $model)
    {
        parent::__construct($model);
    }

    public function allWithRelations()
    {
        return $this->model
            ->with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail'])
            ->orderBy('name')
            ->get();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->with(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail'])
            ->findOrFail($id);
    }

    public function createTierBased(array $productData): Product
    {
        return $this->model->create($productData);
    }

    public function createUnitPriced(array $productData, ?array $priceData, ?float $bottleVolume): Product
    {
        $product = $this->model->create($productData);

        if ($priceData !== null) {
            ProductPrice::create(array_merge(['product_id' => $product->id], $priceData));
        }

        if ($bottleVolume !== null) {
            OriginalPerfumeDetail::create([
                'product_id'    => $product->id,
                'bottle_volume' => $bottleVolume,
            ]);
        }

        return $product;
    }

    public function updateProduct(int $id, array $productData, ?array $priceData, ?float $bottleVolume): void
    {
        $product = $this->model->findOrFail($id);
        $product->update($productData);

        if ($priceData !== null) {
            ProductPrice::updateOrCreate(
                ['product_id' => $product->id],
                $priceData
            );
        }

        if ($bottleVolume !== null) {
            OriginalPerfumeDetail::updateOrCreate(
                ['product_id' => $product->id],
                ['bottle_volume' => $bottleVolume]
            );
        }
    }

    public function isUsed(int $id): bool
    {
        return $this->model->findOrFail($id)->invoiceItems()->exists();
    }
}
