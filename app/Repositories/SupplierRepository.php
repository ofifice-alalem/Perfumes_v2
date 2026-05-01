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

    public function allOrdered()
    {
        return $this->model->orderBy('name')->get();
    }

    public function allActive()
    {
        return $this->model->where('is_active', true)
            ->where('id', '!=', 1)
            ->orderBy('name')
            ->get();
    }

    public function hasPurchases(int $id): bool
    {
        return $this->model->findOrFail($id)->purchases()->exists();
    }
}
