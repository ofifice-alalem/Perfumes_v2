<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface SupplierSettlementRepositoryInterface extends Repository
{
    public function paginated(int $perPage = 20);
}
