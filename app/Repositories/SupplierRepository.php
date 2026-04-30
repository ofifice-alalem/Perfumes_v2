<?php

namespace App\Repositories;

use App\Models\Supplier;
use App\Repositories\Contracts\SupplierRepositoryInterface;

class SupplierRepository extends BaseRepository implements SupplierRepositoryInterface
{
    public function __construct(Supplier $model)
    {
        parent::__construct($model);
    }

    public function allActive()
    {
        return $this->model->where('is_active', true)->orderBy('name')->get();
    }

    public function allOrdered()
    {
        return $this->model->orderBy('name')->get();
    }

    public function hasPurchases(int $id): bool
    {
        return $this->model->findOrFail($id)->purchases()->exists();
    }

    public function updateDebt(int $id, float $amount): void
    {
        $supplier = $this->model->findOrFail($id);
        $supplier->increment('total_debt', $amount);
    }
}