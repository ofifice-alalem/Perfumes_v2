<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface UserRepositoryInterface extends Repository
{
    public function allOrdered();
    public function paginated(int $perPage = 20);
}
