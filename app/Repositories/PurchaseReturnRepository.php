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

    public function paginated(int $perPage = 5)
    {
        return QueryBuilder::for($this->model->with(['supplier', 'purchase'])->withSum('settlements as settlements_total', 'amount'))
            ->allowedFilters(
                AllowedFilter::exact('supplier_id'),
                AllowedFilter::exact('purchase_id'),
                AllowedFilter::callback('date_from',   fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to',     fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('amount_from', fn($q, $v) => $q->where('total', '>=', $v)),
                AllowedFilter::callback('amount_to',   fn($q, $v) => $q->where('total', '<=', $v)),
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
