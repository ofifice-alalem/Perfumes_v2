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
        $periodId = app(\App\Services\RolloverService::class)->getCurrentPeriodId();

        return QueryBuilder::for($this->model->withTrashed()->where('period_id', $periodId)->with(['supplier', 'purchase'])->withSum('settlements as settlements_total', 'amount'))
            ->allowedFilters(
                AllowedFilter::exact('supplier_id'),
                AllowedFilter::exact('purchase_id'),
                AllowedFilter::callback('date_from',   fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to',     fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('amount_from', fn($q, $v) => $q->where('total', '>=', $v)),
                AllowedFilter::callback('amount_to',   fn($q, $v) => $q->where('total', '<=', $v)),
                AllowedFilter::exact('recovery_status'),
                AllowedFilter::callback('product_id',        fn($q, $v) => $q->whereHas('items', fn($q) => $q->where('product_id', $v))),
                AllowedFilter::callback('payment_method_id', fn($q, $v) =>
                    $v === 'hybrid'
                        ? $q->whereHas('settlements', fn($q) => $q->select('purchase_return_id')
                            ->groupBy('purchase_return_id')
                            ->havingRaw('COUNT(DISTINCT payment_method_id) > 1'))
                        : $q->whereHas('settlements', fn($q) => $q->where('payment_method_id', $v))
                             ->whereDoesntHave('settlements', fn($q) => $q->where('payment_method_id', '!=', $v))
                ),
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
            ->with(['supplier', 'user', 'purchase', 'items.product', 'settlements.paymentMethod'])
            ->findOrFail($id);
    }
}
