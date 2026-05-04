<?php

namespace App\Repositories;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\SupplierPayment;
use App\Models\Product;
use App\Models\Supplier;
use App\Repositories\Contracts\PurchaseRepositoryInterface;
use Illuminate\Support\Facades\DB;

class PurchaseRepository extends BaseRepository implements PurchaseRepositoryInterface
{
    public function __construct(Purchase $model)
    {
        parent::__construct($model);
    }

    public function allWithRelations()
    {
        return $this->model
            ->with(['supplier', 'items.product', 'payments.paymentMethod'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->with(['supplier', 'items.product.category', 'payments.paymentMethod'])
            ->findOrFail($id);
    }

    public function createPurchase(array $data): Purchase
    {
        return $this->model->create([
            'supplier_id'    => $data['supplier_id'],
            'total'          => 0,
            'paid_amount'    => 0,
            'due_amount'     => 0,
            'payment_status' => 'unpaid',
            'notes'          => $data['notes'] ?? null,
        ]);
    }

    public function addItem(int $purchaseId, array $itemData): void
    {
        DB::transaction(function () use ($purchaseId, $itemData) {
            $purchase = $this->model->findOrFail($purchaseId);

            $quantity  = (float) $itemData['quantity'];
            $unitCost  = (float) $itemData['unit_cost'];
            $lineTotal = $quantity * $unitCost;

            PurchaseItem::create([
                'purchase_id' => $purchaseId,
                'product_id'  => $itemData['product_id'],
                'quantity'    => $quantity,
                'unit_cost'   => $unitCost,
                'line_total'  => $lineTotal,
            ]);

            // زيادة المخزون
            Product::findOrFail($itemData['product_id'])->increment('stock', $quantity);

            $purchase->recalculate();
            $this->updateSupplierDebt($purchase->fresh());
        });
    }

    public function updateItem(int $purchaseId, int $itemId, array $data): void
    {
        DB::transaction(function () use ($purchaseId, $itemId, $data) {
            $item = PurchaseItem::where('purchase_id', $purchaseId)->findOrFail($itemId);

            $oldQty  = (float) $item->quantity;
            $newQty  = (float) $data['quantity'];
            $diff    = $newQty - $oldQty;

            if ($diff !== 0.0) {
                Product::findOrFail($item->product_id)->increment('stock', $diff);
            }

            $item->update([
                'quantity'   => $newQty,
                'unit_cost'  => $data['unit_cost'],
                'line_total' => $newQty * (float) $data['unit_cost'],
            ]);

            $purchase = $this->model->findOrFail($purchaseId);
            $purchase->recalculate();

            // المورد النقدي: تحديث الدفعة لتطابق الإجمالي الجديد
            if ($purchase->supplier_id == 1) {
                $payment = SupplierPayment::where('purchase_id', $purchaseId)->first();
                if ($payment) {
                    $payment->update(['amount' => $purchase->fresh()->total]);
                    $purchase->recalculate();
                }
            }

            $this->updateSupplierDebt($purchase->fresh());
        });
    }

    public function removeItem(int $purchaseId, int $itemId): void
    {
        DB::transaction(function () use ($purchaseId, $itemId) {
            $item = PurchaseItem::where('purchase_id', $purchaseId)->findOrFail($itemId);

            Product::findOrFail($item->product_id)->decrement('stock', $item->quantity);
            $item->delete();

            $purchase = $this->model->findOrFail($purchaseId);
            $purchase->recalculate();

            // المورد النقدي: تحديث الدفعة لتطابق الإجمالي الجديد
            if ($purchase->supplier_id == 1) {
                $payment = SupplierPayment::where('purchase_id', $purchaseId)->first();
                if ($payment) {
                    $payment->update(['amount' => $purchase->fresh()->total]);
                    $purchase->recalculate();
                }
            }

            $this->updateSupplierDebt($purchase->fresh());
        });
    }

    public function addPayment(int $purchaseId, array $paymentData): void
    {
        DB::transaction(function () use ($purchaseId, $paymentData) {
            $purchase = $this->model->findOrFail($purchaseId);

            if ($paymentData['amount'] > $purchase->due_amount) {
                throw new \Exception("المبلغ يتجاوز المتبقي: {$purchase->due_amount}");
            }

            SupplierPayment::create([
                'supplier_id'       => $purchase->supplier_id,
                'purchase_id'       => $purchaseId,
                'payment_method_id' => $paymentData['payment_method_id'],
                'amount'            => $paymentData['amount'],
                'notes'             => $paymentData['notes'] ?? null,
            ]);

            $purchase->recalculate();
            $this->updateSupplierDebt($purchase->fresh());
        });
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    private function updateSupplierDebt(Purchase $purchase): void
    {
        $supplier = Supplier::findOrFail($purchase->supplier_id);

        $totalPurchases = $this->model
            ->where('supplier_id', $purchase->supplier_id)
            ->sum('total');

        $totalPaid = SupplierPayment::where('supplier_id', $purchase->supplier_id)->sum('amount');
        $totalSettled = \App\Models\SupplierSettlement::where('supplier_id', $purchase->supplier_id)->sum('amount');
        $totalDebt = $totalPurchases - $totalPaid - $totalSettled;

        $supplier->update([
            'total_debt'      => $totalDebt,
            'total_purchases' => $totalPurchases,
        ]);
    }
}
