<?php

namespace App\Repositories;

use App\Repositories\Contracts\SupplierRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class SupplierRepository extends Repository implements SupplierRepositoryInterface
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
