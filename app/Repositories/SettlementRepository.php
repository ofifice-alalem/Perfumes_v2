<?php

namespace App\Repositories;

use App\Models\Settlement;
use App\Repositories\Contracts\SettlementRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class SettlementRepository extends Repository implements SettlementRepositoryInterface
{
    public function model(): string
    {
        return Settlement::class;
    }

    public function paginated(int $perPage = 5)
    {
        return QueryBuilder::for($this->model->withTrashed()->with(['customer', 'invoice', 'invoiceReturn', 'paymentMethod']))
            ->allowedFilters(
                AllowedFilter::exact('customer_id'),
                AllowedFilter::exact('invoice_id'),
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
