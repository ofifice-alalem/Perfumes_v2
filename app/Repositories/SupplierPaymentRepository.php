<?php

namespace App\Repositories;

use App\Models\SupplierPayment;
use App\Repositories\Contracts\SupplierPaymentRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class SupplierPaymentRepository extends Repository implements SupplierPaymentRepositoryInterface
{
    public function model(): string
    {
        return SupplierPayment::class;
    }

    public function paginated(int $perPage = 20)
    {
        return QueryBuilder::for($this->model->with(['supplier', 'purchase', 'paymentMethod']))
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
