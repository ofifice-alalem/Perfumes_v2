<?php

namespace App\Repositories;

use App\Repositories\Contracts\SupplierRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class SupplierRepository extends Repository implements SupplierRepositoryInterface
{
    public function allOrdered()
    {
        return $this->model->orderBy('id')->get();
    }

    public function paginated(int $perPage = 20)
    {
        return $this->model->withoutCash()->orderBy('name')->paginate($perPage);
    }

    public function forSelectList()
    {
        return $this->model->withoutCash()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'phone']);
    }
}
