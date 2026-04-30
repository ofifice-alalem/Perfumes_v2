<?php

namespace App\Repositories;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use App\Models\SupplierPayment;
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
        return $this->model->with(['supplier', 'items.product', 'payments.paymentMethod'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findWithRelations(int $id)
    {
        return $this->model->with(['supplier', 'items.product', 'payments.paymentMethod'])
            ->findOrFail($id);
    }

    public function createPurchase(array $data)
    {
        return DB::transaction(function () use ($data) {
            $purchase = $this->model->create([
                'supplier_id' => $data['supplier_id'],
                'notes' => $data['notes'] ?? null,
                'total' => 0,
                'paid_amount' => 0,
                'due_amount' => 0,
                'payment_status' => 'unpaid',
            ]);

            return $purchase;
        });
    }

    public function addItem(int $purchaseId, array $data)
    {
        return DB::transaction(function () use ($purchaseId, $data) {
            $purchase = $this->findOrFail($purchaseId);
            $product = Product::findOrFail($data['product_id']);

            // إنشاء سطر المشتريات
            $item = PurchaseItem::create([
                'purchase_id' => $purchaseId,
                'product_id' => $data['product_id'],
                'quantity' => $data['quantity'],
                'unit_cost' => $data['unit_cost'],
                'line_total' => $data['quantity'] * $data['unit_cost'],
            ]);

            // تحديث المخزون
            $product->increment('stock', $data['quantity']);

            // إعادة حساب إجماليات الفاتورة
            $purchase->recalculate();

            return $item;
        });
    }

    public function removeItem(int $purchaseId, int $itemId)
    {
        return DB::transaction(function () use ($purchaseId, $itemId) {
            $purchase = $this->findOrFail($purchaseId);
            $item = PurchaseItem::where('purchase_id', $purchaseId)
                ->where('id', $itemId)
                ->firstOrFail();

            // إعادة المخزون
            $item->product->decrement('stock', $item->quantity);

            // حذف السطر
            $item->delete();

            // إعادة حساب الإجماليات
            $purchase->recalculate();

            return true;
        });
    }

    public function addPayment(int $purchaseId, array $data)
    {
        return DB::transaction(function () use ($purchaseId, $data) {
            $purchase = $this->findOrFail($purchaseId);

            // التحقق من عدم تجاوز المبلغ المطلوب
            if (($purchase->paid_amount + $data['amount']) > $purchase->total) {
                throw new \Exception('المبلغ يتجاوز إجمالي الفاتورة');
            }

            // إنشاء الدفعة
            $payment = SupplierPayment::create([
                'purchase_id' => $purchaseId,
                'payment_method_id' => $data['payment_method_id'],
                'amount' => $data['amount'],
                'notes' => $data['notes'] ?? null,
            ]);

            // إعادة حساب الإجماليات
            $purchase->recalculate();

            // تحديث دين المورد
            $purchase->supplier->decrement('total_debt', $data['amount']);

            return $payment;
        });
    }
}