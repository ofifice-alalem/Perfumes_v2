<?php

namespace App\Repositories;

use App\Repositories\Contracts\SizeRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;

class SizeRepository extends Repository implements SizeRepositoryInterface
{
    public function allOrdered()
    {
        return $this->model->orderBy('unit')->orderBy('value')->get();
    }

    public function isUsed(int $id): bool
    {
        $size = $this->find($id);
        return $size->tierPrices()->exists() || $size->invoiceItems()->exists();
    }
}
