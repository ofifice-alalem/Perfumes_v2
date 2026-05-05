<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface SupplierPaymentRepositoryInterface extends Repository
{
    public function paginated(int $perPage = 20);
}
