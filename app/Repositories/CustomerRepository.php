<?php

namespace App\Repositories;

use App\Models\Customer;
use App\Repositories\Contracts\CustomerRepositoryInterface;

class CustomerRepository extends BaseRepository implements CustomerRepositoryInterface
{
    public function __construct(Customer $model)
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

    public function hasInvoices(int $id): bool
    {
        return $this->model->findOrFail($id)->invoices()->exists();
    }
}
