<?php

namespace App\Repositories;

use App\Repositories\Contracts\CustomerRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class CustomerRepository extends Repository implements CustomerRepositoryInterface
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
