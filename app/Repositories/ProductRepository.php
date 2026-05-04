<?php

namespace App\Repositories;

use App\Models\OriginalPerfumeDetail;
use App\Models\ProductPrice;
use App\Repositories\Contracts\ProductRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Prettus\Repository\Eloquent\Repository;

class ProductRepository extends Repository implements ProductRepositoryInterface
{
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

    public function createWithRelations(array $data)
    {
        return DB::transaction(function () use ($data) {
            $product = $this->create([
                'name'          => $data['name'],
                'category_id'   => $data['category_id'],
                'price_tier_id' => $data['price_tier_id'] ?? null,
                'selling_type'  => $data['selling_type'],
                'min_stock'     => $data['min_stock'] ?? 0,
            ]);

            if ($data['selling_type'] === 'unit_priced') {
                $category = \App\Models\Category::find($data['category_id']);

                if (!$category->is_operational) {
                    ProductPrice::create([
                        'product_id'             => $product->id,
                        'price_per_unit_regular' => $data['price_per_unit_regular'],
                        'price_per_unit_vip'     => $data['price_per_unit_vip'],
                        'full_bottle_regular'    => $data['full_bottle_regular'] ?? null,
                        'full_bottle_vip'        => $data['full_bottle_vip'] ?? null,
                    ]);

                    if (!empty($data['bottle_volume'])) {
                        OriginalPerfumeDetail::create([
                            'product_id'    => $product->id,
                            'bottle_volume' => $data['bottle_volume'],
                        ]);
                    }
                }
            }

            return $product->load(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail']);
        });
    }

    public function updateWithRelations(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $product = $this->find($id);

            $this->update([
                'name'          => $data['name'],
                'category_id'   => $data['category_id'],
                'price_tier_id' => $data['price_tier_id'] ?? null,
                'selling_type'  => $data['selling_type'],
                'min_stock'     => $data['min_stock'] ?? 0,
            ], $id);

            if ($data['selling_type'] === 'unit_priced') {
                $category = \App\Models\Category::find($data['category_id']);

                if (!$category->is_operational) {
                    ProductPrice::updateOrCreate(
                        ['product_id' => $product->id],
                        [
                            'price_per_unit_regular' => $data['price_per_unit_regular'],
                            'price_per_unit_vip'     => $data['price_per_unit_vip'],
                            'full_bottle_regular'    => $data['full_bottle_regular'] ?? null,
                            'full_bottle_vip'        => $data['full_bottle_vip'] ?? null,
                        ]
                    );

                    if (!empty($data['bottle_volume'])) {
                        OriginalPerfumeDetail::updateOrCreate(
                            ['product_id' => $product->id],
                            ['bottle_volume' => $data['bottle_volume']]
                        );
                    } else {
                        OriginalPerfumeDetail::where('product_id', $product->id)->delete();
                    }
                } else {
                    ProductPrice::where('product_id', $product->id)->delete();
                    OriginalPerfumeDetail::where('product_id', $product->id)->delete();
                }
            } else {
                ProductPrice::where('product_id', $product->id)->delete();
                OriginalPerfumeDetail::where('product_id', $product->id)->delete();
            }

            return $product->fresh(['category', 'priceTier', 'productPrice', 'originalPerfumeDetail']);
        });
    }

    public function isUsed(int $id): bool
    {
        $product = $this->find($id);
        return $product->invoiceItems()->exists() || $product->purchaseItems()->exists();
    }
}
