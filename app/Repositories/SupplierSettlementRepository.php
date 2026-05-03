<?php

namespace App\Repositories;

use App\Models\SupplierSettlement;
use App\Models\SupplierPayment;
use App\Repositories\Contracts\SupplierSettlementRepositoryInterface;
use Illuminate\Support\Facades\DB;

class SupplierSettlementRepository extends BaseRepository implements SupplierSettlementRepositoryInterface
{
    public function __construct(SupplierSettlement $model)
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
            ->with(['supplier', 'purchase', 'paymentMethod'])
            ->findOrFail($id);
    }

    public function createSettlement(array $data): SupplierSettlement
    {
        return DB::transaction(function () use ($data) {
            $settlement = $this->model->create([
                'supplier_id'       => $data['supplier_id'],
                'purchase_id'       => $data['purchase_id'] ?? null,
                'payment_method_id' => $data['payment_method_id'],
                'amount'            => $data['amount'],
                'notes'             => $data['notes'] ?? null,
            ]);

            $this->recalculateSupplierDebt($data['supplier_id']);

            return $settlement;
        });
    }

    public function deleteSettlement(int $id): void
    {
        DB::transaction(function () use ($id) {
            $settlement = $this->model->findOrFail($id);
            $supplierId = $settlement->supplier_id;
            $settlement->delete();
            $this->recalculateSupplierDebt($supplierId);
        });
    }

    private function recalculateSupplierDebt(int $supplierId): void
    {
        if ($supplierId === 1) return;

        $supplier = \App\Models\Supplier::find($supplierId);
        if (!$supplier) return;

        $totalPurchases = \App\Models\Purchase::where('supplier_id', $supplierId)->sum('total');
        $totalPaid      = SupplierPayment::where('supplier_id', $supplierId)->sum('amount');
        $totalSettled   = $this->model->where('supplier_id', $supplierId)->sum('amount');
        $totalDebt      = $totalPurchases - $totalPaid + $totalSettled;

        $supplier->update([
            'total_debt'      => $totalDebt,
            'total_purchases' => $totalPurchases,
        ]);
    }
}
