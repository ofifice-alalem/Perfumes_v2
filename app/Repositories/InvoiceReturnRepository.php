<?php

namespace App\Repositories;

use App\Models\InvoiceReturn;
use App\Repositories\Contracts\InvoiceReturnRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class InvoiceReturnRepository extends Repository implements InvoiceReturnRepositoryInterface
{
    public function model(): string
    {
        return InvoiceReturn::class;
    }

    public function paginated(int $perPage = 5)
    {
        $periodId = app(\App\Services\RolloverService::class)->getCurrentPeriodId();

        return QueryBuilder::for($this->model->withTrashed()->where('period_id', $periodId)->with(['customer', 'invoice'])->withSum('settlements as settlements_total', 'amount'))
            ->allowedFilters(
                AllowedFilter::exact('customer_id'),
                AllowedFilter::exact('invoice_id'),
                AllowedFilter::callback('date_from',   fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to',     fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('amount_from', fn($q, $v) => $q->where('total', '>=', $v)),
                AllowedFilter::callback('amount_to',   fn($q, $v) => $q->where('total', '<=', $v)),
                AllowedFilter::exact('recovery_status'),
                AllowedFilter::callback('product_id',        fn($q, $v) => $q->whereHas('items', fn($q) => $q->where('product_id', $v))),
                AllowedFilter::callback('payment_method_id', fn($q, $v) =>
                    $v === 'hybrid'
                        ? $q->whereHas('settlements', fn($q) => $q->select('invoice_return_id')
                            ->groupBy('invoice_return_id')
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
        $return = $this->model
            ->withTrashed()
            ->with(['customer', 'invoice', 'items.product', 'items.size', 'settlements.paymentMethod'])
            ->findOrFail($id);

        // Load customer debt info
        $return->customer->total_debt = \App\Models\Customer::find($return->customer_id)?->total_debt ?? 0;

        return $return;
    }
}
