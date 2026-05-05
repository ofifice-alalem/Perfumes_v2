<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface PaymentMethodRepositoryInterface extends Repository
{
    public function allOrdered();
    public function activeOnly();
}
