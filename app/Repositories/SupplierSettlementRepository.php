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

    public function paginated(int $perPage = 5)
    {
        $periodId = app(\App\Services\RolloverService::class)->getCurrentPeriodId();

        return QueryBuilder::for($this->model->withTrashed()->where('period_id', $periodId)->with(['supplier', 'purchase', 'purchaseReturn', 'paymentMethod']))
            ->allowedFilters(
                AllowedFilter::exact('supplier_id'),
                AllowedFilter::exact('purchase_id'),
                AllowedFilter::exact('payment_method_id'),
                AllowedFilter::callback('date_from',   fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to',     fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('amount_from', fn($q, $v) => $q->where('amount', '>=', $v)),
                AllowedFilter::callback('amount_to',   fn($q, $v) => $q->where('amount', '<=', $v)),
            )
            ->allowedSorts('created_at', 'amount')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }
}
