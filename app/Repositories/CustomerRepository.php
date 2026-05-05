<?php

namespace App\Repositories;

use App\Repositories\Contracts\CustomerRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CustomerRepository extends Repository implements CustomerRepositoryInterface
{
    public function allOrdered()
    {
        return QueryBuilder::for($this->model->newQuery())
            ->allowedFilters(
                AllowedFilter::partial('name'),
                AllowedFilter::partial('phone'),
                AllowedFilter::exact('is_active'),
            )
            ->allowedSorts('name', 'total_debt', 'created_at')
            ->defaultSort('name')
            ->get();
    }

    public function paginated(int $perPage = 20)
    {
        return QueryBuilder::for($this->model->withoutCash())
            ->allowedFilters(
                AllowedFilter::partial('name'),
                AllowedFilter::partial('phone'),
                AllowedFilter::exact('is_active'),
            )
            ->allowedSorts('name', 'total_debt', 'created_at')
            ->defaultSort('name')
            ->paginate($perPage);
    }

    public function forSelectList()
    {
        return $this->model->withoutCash()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'phone']);
    }
}
