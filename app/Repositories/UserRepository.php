<?php

namespace App\Repositories;

use App\Repositories\Contracts\UserRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class UserRepository extends Repository implements UserRepositoryInterface
{
    public function allOrdered()
    {
        return $this->model->with('roles')->orderBy('name')->get()->map(fn($u) => [
            'id'       => $u->id,
            'name'     => $u->name,
            'username' => $u->username,
            'email'    => $u->email,
            'role'     => $u->getRoleNames()->first() ?? '',
        ]);
    }

    public function paginated(int $perPage = 20)
    {
        return $this->model->orderBy('name')->paginate($perPage);
    }
}
