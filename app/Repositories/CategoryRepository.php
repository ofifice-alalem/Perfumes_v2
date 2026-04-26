<?php

namespace App\Repositories;

use App\Models\Category;
use App\Repositories\Contracts\CategoryRepositoryInterface;

class CategoryRepository extends BaseRepository implements CategoryRepositoryInterface
{
    public function __construct(Category $model)
    {
        parent::__construct($model);
    }

    public function allOrdered()
    {
        return $this->model->orderBy('name')->get();
    }

    public function hasProducts(int $id): bool
    {
        return $this->model->findOrFail($id)->products()->exists();
    }
}
