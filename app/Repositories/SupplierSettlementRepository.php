<?php

namespace App\Repositories;

use App\Models\SupplierSettlement;
use App\Repositories\Contracts\SupplierSettlementRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class SupplierSettlementRepository extends Repository implements SupplierSettlementRepositoryInterface
{
    public function model(): string
    {
        return SupplierSettlement::class;
    }

    public function paginated(int $perPage = 20)
    {
        return QueryBuilder::for($this->model->with(['supplier', 'purchase', 'purchaseReturn', 'paymentMethod']))
            ->allowedFilters(
                AllowedFilter::exact('supplier_id'),
                AllowedFilter::exact('purchase_id'),
            )
            ->allowedSorts('created_at', 'amount')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }
}
