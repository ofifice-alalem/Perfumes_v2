<?php

namespace App\Repositories\Contracts;

interface SettlementRepositoryInterface
{
    public function paginated(int $perPage = 5);
}
