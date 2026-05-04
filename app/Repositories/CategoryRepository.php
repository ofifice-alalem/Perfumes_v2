<?php

namespace App\Repositories;

use App\Repositories\Contracts\CategoryRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class CategoryRepository extends Repository implements CategoryRepositoryInterface
{
    public function allOrdered()
    {
        return $this->model->orderBy('name')->get();
    }

    public function hasProducts(int $id): bool
    {
        return $this->find($id)->products()->exists();
    }
}
