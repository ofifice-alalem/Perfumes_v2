<?php

namespace App\Repositories;

use App\Models\Invoice;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class InvoiceRepository extends Repository implements InvoiceRepositoryInterface
{
    public function model(): string
    {
        return Invoice::class;
    }

    public function paginated(int $perPage = 5)
    {
        $periodId = app(\App\Services\RolloverService::class)->getCurrentPeriodId();

        return QueryBuilder::for($this->model->withTrashed()->where('period_id', $periodId)->with(['customer', 'user'])->withSum('payments as paid_amount_sum', 'amount')->withSum('settlements as settlements_total', 'amount'))
            ->allowedFilters(
                AllowedFilter::exact('customer_id'),
                AllowedFilter::exact('user_id'),
                AllowedFilter::exact('payment_status'),
                AllowedFilter::callback('date_from',    fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to',      fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('amount_from',  fn($q, $v) => $q->where('total', '>=', $v)),
                AllowedFilter::callback('amount_to',    fn($q, $v) => $q->where('total', '<=', $v)),
                AllowedFilter::callback('product_id',   fn($q, $v) => $q->whereHas('items', fn($q) => $q->where('product_id', $v))),
                AllowedFilter::callback('payment_method_id', fn($q, $v) =>
                    $v === 'hybrid'
                        ? $q->whereHas('payments', fn($q) => $q->select('invoice_id')
                            ->groupBy('invoice_id')
                            ->havingRaw('COUNT(DISTINCT payment_method_id) > 1'))
                        : $q->whereHas('payments', fn($q) => $q->where('payment_method_id', $v))
                             ->whereDoesntHave('payments', fn($q) => $q->where('payment_method_id', '!=', $v))
                ),
            )
            ->allowedSorts('created_at', 'total', 'payment_status')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->withTrashed()
            ->with([
                'customer',
                'user',
                'items.product',
                'items.size',
                'payments.paymentMethod',
                'payments.user',
                'settlements.paymentMethod',
                'settlements.user',
                'returns.items.product',
                'returns.settlement',
            ])
            ->findOrFail($id);
    }
}
