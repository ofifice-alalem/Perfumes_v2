<?php

namespace App\Repositories;

use App\Models\WasteLog;
use App\Repositories\Contracts\WasteLogRepositoryInterface;
use Prettus\Repository\Eloquent\Repository;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class WasteLogRepository extends Repository implements WasteLogRepositoryInterface
{
    public function model(): string
    {
        return WasteLog::class;
    }

    public function paginated(int $perPage = 20)
    {
        return QueryBuilder::for($this->model->with(['user', 'items.product.category']))
            ->allowedFilters(
                AllowedFilter::exact('user_id'),
                AllowedFilter::callback('date_from', fn($q, $v) => $q->whereDate('created_at', '>=', $v)),
                AllowedFilter::callback('date_to', fn($q, $v) => $q->whereDate('created_at', '<=', $v)),
                AllowedFilter::callback('product_id', fn($q, $v) => $q->whereHas('items', fn($q) => $q->where('product_id', $v))),
                AllowedFilter::callback('reason', fn($q, $v) => $q->whereHas('items', fn($q) => $q->where('reason', $v))),
            )
            ->allowedSorts('created_at', 'user_id')
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->withQueryString();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->with([
                'user',
                'items.product.category',
            ])
            ->findOrFail($id);
    }
}
