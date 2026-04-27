<?php

namespace App\Repositories;

use App\Models\PaymentMethod;
use App\Repositories\Contracts\PaymentMethodRepositoryInterface;

class PaymentMethodRepository extends BaseRepository implements PaymentMethodRepositoryInterface
{
    public function __construct(PaymentMethod $model)
    {
        parent::__construct($model);
    }

    public function allOrdered()
    {
        return $this->model->orderBy('name')->get();
    }

    public function allActive()
    {
        return $this->model->where('is_active', true)->orderBy('name')->get();
    }

    public function isUsed(int $id): bool
    {
        $method = $this->model->findOrFail($id);
        return $method->payments()->exists() || $method->supplierPayments()->exists();
    }
}
