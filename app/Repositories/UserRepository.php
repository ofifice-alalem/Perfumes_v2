<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;

class UserRepository extends BaseRepository implements UserRepositoryInterface
{
    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    public function allOrdered()
    {
        return $this->model->orderBy('name')->get();
    }

    public function hasInvoices(int $id): bool
    {
        return $this->model->findOrFail($id)->invoices()->exists();
    }
}
