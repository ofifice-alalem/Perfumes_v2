<?php

namespace App\Repositories;

use App\Repositories\Contracts\PaymentMethodRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class PaymentMethodRepository extends Repository implements PaymentMethodRepositoryInterface
{
    public function allOrdered()
    {
        return $this->model->orderBy('id')->get();
    }

    public function activeOnly()
    {
        return $this->model->where('is_active', true)->orderBy('id')->get();
    }
}
