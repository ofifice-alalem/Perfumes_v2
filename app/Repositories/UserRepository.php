<?php

namespace App\Repositories;

use App\Repositories\Contracts\UserRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class UserRepository extends Repository implements UserRepositoryInterface
{
    public function allOrdered()
    {
        return $this->model->orderBy('name')->get();
    }

    public function paginated(int $perPage = 20)
    {
        return $this->model->orderBy('name')->paginate($perPage);
    }
}
