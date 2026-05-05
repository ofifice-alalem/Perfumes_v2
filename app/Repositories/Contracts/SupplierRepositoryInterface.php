<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface SupplierRepositoryInterface extends Repository
{
    public function allOrdered();
    public function allWithoutCash();
    public function paginated(int $perPage = 20);
    public function forSelectList();
}
