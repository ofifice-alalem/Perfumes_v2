<?php

namespace App\Repositories;

use App\Models\WasteLog;
use App\Models\WasteItem;
use App\Models\Product;
use App\Repositories\Contracts\WasteRepositoryInterface;
use Illuminate\Support\Facades\DB;

class WasteRepository extends BaseRepository implements WasteRepositoryInterface
{
    public function __construct(WasteLog $model)
    {
        parent::__construct($model);
    }

    public function allWithRelations()
    {
        return $this->model
            ->with(['user', 'items.product.category'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->with(['user', 'items.product.category'])
            ->findOrFail($id);
    }

    public function createLog(array $data): WasteLog
    {
        return $this->model->create([
            'user_id' => $data['user_id'],
            'notes'   => $data['notes'] ?? null,
        ]);
    }

    public function addItem(int $logId, array $itemData): void
    {
        DB::transaction(function () use ($logId, $itemData) {
            $product  = Product::findOrFail($itemData['product_id']);
            $quantity = (float) $itemData['quantity'];

            if ($product->stock < $quantity) {
                throw new \Exception("المخزون غير كافٍ. المتاح: {$product->stock}");
            }

            WasteItem::create([
                'waste_log_id' => $logId,
                'product_id'   => $product->id,
                'quantity'     => $quantity,
                'reason'       => $itemData['reason'] ?? 'other',
                'notes'        => $itemData['notes'] ?? null,
            ]);

            $product->decrement('stock', $quantity);
        });
    }

    public function updateItem(int $logId, int $itemId, array $data): void
    {
        DB::transaction(function () use ($logId, $itemId, $data) {
            $item    = WasteItem::where('waste_log_id', $logId)->findOrFail($itemId);
            $oldQty  = (float) $item->quantity;
            $newQty  = (float) $data['quantity'];
            $diff    = $newQty - $oldQty;

            $product = Product::findOrFail($item->product_id);

            if ($diff > 0 && $product->stock < $diff) {
                throw new \Exception("المخزون غير كافٍ. المتاح: {$product->stock}");
            }

            if ($diff !== 0.0) {
                $product->decrement('stock', $diff);
            }

            $item->update([
                'quantity' => $newQty,
                'reason'   => $data['reason'],
            ]);
        });
    }

    public function removeItem(int $logId, int $itemId): void
    {
        DB::transaction(function () use ($logId, $itemId) {
            $item = WasteItem::where('waste_log_id', $logId)->findOrFail($itemId);

            Product::findOrFail($item->product_id)->increment('stock', $item->quantity);

            $item->delete();
        });
    }
}
