<?php

namespace App\Repositories;

use App\Models\SupplierPayment;
use App\Models\SupplierSettlement;
use App\Repositories\Contracts\SupplierPaymentRepositoryInterface;
use Illuminate\Support\Facades\DB;

class SupplierPaymentRepository extends BaseRepository implements SupplierPaymentRepositoryInterface
{
    public function __construct(SupplierPayment $model)
    {
        parent::__construct($model);
    }

    public function allWithRelations()
    {
        return $this->model
            ->with(['supplier', 'purchase', 'paymentMethod'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function filter(array $params)
    {
        $q = $this->model
            ->with(['supplier', 'purchase', 'paymentMethod'])
            ->orderByDesc('created_at');

        if (!empty($params['supplier_id']))
            $q->where('supplier_id', $params['supplier_id']);

        if (!empty($params['payment_method_id']))
            $q->where('payment_method_id', $params['payment_method_id']);

        if (!empty($params['date_from']))
            $q->whereDate('created_at', '>=', $params['date_from']);

        if (!empty($params['date_to']))
            $q->whereDate('created_at', '<=', $params['date_to']);

        if (!empty($params['amount_min']))
            $q->where('amount', '>=', $params['amount_min']);

        if (!empty($params['amount_max']))
            $q->where('amount', '<=', $params['amount_max']);

        return $q->paginate(30)->withQueryString();
    }

    public function findWithRelations(int $id)
    {
        return $this->model
            ->with(['supplier', 'purchase.items.product', 'paymentMethod'])
            ->findOrFail($id);
    }

    public function createPayment(array $data): SupplierPayment
    {
        return DB::transaction(function () use ($data) {
            $payment = $this->model->create([
                'supplier_id'       => $data['supplier_id'],
                'purchase_id'       => $data['purchase_id'] ?? null,
                'payment_method_id' => $data['payment_method_id'],
                'amount'            => $data['amount'],
                'notes'             => $data['notes'] ?? null,
            ]);

            $this->recalculateSupplierDebt($data['supplier_id']);

            return $payment;
        });
    }

    public function deletePayment(int $id): void
    {
        DB::transaction(function () use ($id) {
            $payment = $this->model->findOrFail($id);
            $supplierId = $payment->supplier_id;
            $payment->delete();
            $this->recalculateSupplierDebt($supplierId);
        });
    }

    private function recalculateSupplierDebt(int $supplierId): void
    {
        if ($supplierId === 1) return;

        $supplier = \App\Models\Supplier::find($supplierId);
        if (!$supplier) return;

        $totalPurchases = \App\Models\Purchase::where('supplier_id', $supplierId)->sum('total');
        $totalPaid      = $this->model->where('supplier_id', $supplierId)->sum('amount');
        $totalSettled   = SupplierSettlement::where('supplier_id', $supplierId)->sum('amount');
        $totalDebt      = $totalPurchases - $totalPaid + $totalSettled;

        $supplier->update([
            'total_debt'      => $totalDebt,
            'total_purchases' => $totalPurchases,
        ]);
    }
}
