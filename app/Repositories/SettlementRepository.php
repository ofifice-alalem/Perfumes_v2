<?php

namespace App\Repositories;

use App\Models\Settlement;
use App\Models\Payment;
use App\Repositories\Contracts\SettlementRepositoryInterface;
use Illuminate\Support\Facades\DB;

class SettlementRepository extends BaseRepository implements SettlementRepositoryInterface
{
    public function __construct(Settlement $model)
    {
        parent::__construct($model);
    }

    public function allWithRelations()
    {
        return $this->model
            ->with(['customer', 'invoice', 'paymentMethod'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function filter(array $params)
    {
        $q = $this->model
            ->with(['customer', 'invoice', 'paymentMethod'])
            ->orderByDesc('created_at');

        if (!empty($params['customer_id']))
            $q->where('customer_id', $params['customer_id']);

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
            ->with(['customer', 'invoice', 'paymentMethod'])
            ->findOrFail($id);
    }

    public function createSettlement(array $data): Settlement
    {
        return DB::transaction(function () use ($data) {
            $settlement = $this->model->create([
                'customer_id'       => $data['customer_id'],
                'invoice_id'        => $data['invoice_id'] ?? null,
                'payment_method_id' => $data['payment_method_id'],
                'amount'            => $data['amount'],
                'notes'             => $data['notes'] ?? null,
            ]);

            $this->recalculateCustomerDebt($data['customer_id']);

            return $settlement;
        });
    }

    public function deleteSettlement(int $id): void
    {
        DB::transaction(function () use ($id) {
            $settlement = $this->model->findOrFail($id);
            $customerId = $settlement->customer_id;
            $settlement->delete();
            $this->recalculateCustomerDebt($customerId);
        });
    }

    private function recalculateCustomerDebt(int $customerId): void
    {
        if ($customerId === 1) return;

        $customer = \App\Models\Customer::find($customerId);
        if (!$customer) return;

        $totalPurchases = \App\Models\Invoice::where('customer_id', $customerId)->sum('total');
        $totalPaid      = Payment::where('customer_id', $customerId)->sum('amount');
        $totalSettled   = $this->model->where('customer_id', $customerId)->sum('amount');
        $totalDebt      = $totalPurchases - $totalPaid + $totalSettled;

        $customer->update([
            'total_debt'      => max(0, $totalDebt),
            'total_purchases' => $totalPurchases,
        ]);
    }
}
