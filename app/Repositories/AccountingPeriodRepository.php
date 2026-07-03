<?php

namespace App\Repositories;

use App\Models\AccountingPeriod;
use App\Repositories\Contracts\AccountingPeriodRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class AccountingPeriodRepository extends Repository implements AccountingPeriodRepositoryInterface
{
    public function model(): string
    {
        return AccountingPeriod::class;
    }

    public function paginated(int $perPage = 20)
    {
        return QueryBuilder::for($this->model->with(['createdBy', 'snapshot']))
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::callback('date_from', fn($q, $v) => $q->whereDate('started_at', '>=', $v)),
                AllowedFilter::callback('date_to',   fn($q, $v) => $q->whereDate('started_at', '<=', $v)),
            )
            ->allowedSorts('started_at', 'closed_at', 'status')
            ->defaultSort('-started_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findWithSnapshot(int $id)
    {
        return $this->model
            ->with(['createdBy', 'snapshot.createdBy', 'snapshot.items', 'snapshot.dailyProfits', 'snapshot.stockProfits'])
            ->findOrFail($id);
    }
}
