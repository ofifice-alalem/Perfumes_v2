<?php

namespace App\Repositories;

use App\Models\PurchaseReturn;
use App\Repositories\Contracts\PurchaseReturnRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PurchaseReturnRepository extends Repository implements PurchaseReturnRepositoryInterface
{
    public function model(): string
    {
        return PurchaseReturn::class;
    }

    public function paginated(int $perPage = 20)
    {
        return QueryBuilder::for($this->model->with(['supplier', 'purchase']))
            ->allowedFilters(
                AllowedFilter::exact('supplier_id'),
                AllowedFilter::exact('purchase_id'),
            )
            ->allowedSorts('created_at', 'total')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->withTrashed()
            ->with(['supplier', 'purchase', 'items.product', 'settlements.paymentMethod'])
            ->findOrFail($id);
    }
}
