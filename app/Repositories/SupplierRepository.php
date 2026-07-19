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
            ->get()
            ->map(function ($supplier) {
                // Recalculate live for cash supplier (id=1) since observers skip it
                if ($supplier->id === 1) {
                    $periodId = app(\App\Services\RolloverService::class)->getCurrentPeriodId();
                    $periodScope = function ($query) use ($periodId) {
                        if ($periodId) {
                            $query->where(function ($q) use ($periodId) {
                                $q->where('period_id', $periodId)->orWhereNull('period_id');
                            });
                        }
                    };

                    $supplier->total_purchases   = \App\Models\Purchase::where('supplier_id', 1)->where($periodScope)->sum('total');
                    $supplier->total_paid        = \App\Models\SupplierPayment::where('supplier_id', 1)->where($periodScope)->sum('amount');
                    $supplier->total_returns     = \App\Models\PurchaseReturn::where('supplier_id', 1)->where($periodScope)->sum('total');
                    $supplier->total_settlements = \App\Models\SupplierSettlement::where('supplier_id', 1)->where($periodScope)->sum('amount');
                }
                return $supplier;
            });
    }

    public function allWithoutCash()
    {
        return QueryBuilder::for($this->model->withoutCash())
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
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'total_debt', 'is_active']);
    }
}
