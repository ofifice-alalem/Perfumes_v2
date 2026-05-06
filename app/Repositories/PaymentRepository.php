<?php

namespace App\Repositories;

use App\Models\Payment;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PaymentRepository extends Repository implements PaymentRepositoryInterface
{
    public function model(): string
    {
        return Payment::class;
    }

    public function paginated(int $perPage = 5)
    {
        return QueryBuilder::for($this->model->with(['customer', 'invoice', 'paymentMethod']))
            ->allowedFilters(
                AllowedFilter::exact('customer_id'),
                AllowedFilter::exact('invoice_id'),
                AllowedFilter::exact('payment_method_id'),
                AllowedFilter::callback('date_from',   fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to',     fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('amount_from', fn($q, $v) => $q->where('amount', '>=', $v)),
                AllowedFilter::callback('amount_to',   fn($q, $v) => $q->where('amount', '<=', $v)),
                AllowedFilter::callback('product_id',  fn($q, $v) => $q->whereHas('invoice.items', fn($q) => $q->where('product_id', $v))),
            )
            ->allowedSorts('created_at', 'amount')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }
}
