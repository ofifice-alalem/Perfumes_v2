<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface AccountingPeriodRepositoryInterface extends Repository
{
    public function paginated(int $perPage = 20);
    public function findWithSnapshot(int $id);
}
