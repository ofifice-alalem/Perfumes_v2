<?php

namespace App\Repositories;

use App\Models\Size;
use App\Repositories\Contracts\SizeRepositoryInterface;

class SizeRepository extends BaseRepository implements SizeRepositoryInterface
{
    public function __construct(Size $model)
    {
        parent::__construct($model);
    }

    public function allOrdered()
    {
        return $this->model->orderBy('unit')->orderBy('value')->get();
    }

    public function isUsed(int $id): bool
    {
        $size = $this->model->findOrFail($id);
        return $size->tierPrices()->exists() || $size->invoiceItems()->exists();
    }
}
