<?php

namespace App\Repositories;

use App\Models\Payment;
use App\Models\Settlement;
use App\Repositories\Contracts\PaymentRepositoryInterface;
use Illuminate\Support\Facades\DB;

class PaymentRepository extends BaseRepository implements PaymentRepositoryInterface
{
    public function __construct(Payment $model)
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
            ->with(['customer', 'invoice.items.product', 'paymentMethod'])
            ->findOrFail($id);
    }

    public function createPayment(array $data): Payment
    {
        return DB::transaction(function () use ($data) {
            $payment = $this->model->create([
                'customer_id'       => $data['customer_id'],
                'invoice_id'        => $data['invoice_id'] ?? null,
                'payment_method_id' => $data['payment_method_id'],
                'amount'            => $data['amount'],
                'notes'             => $data['notes'] ?? null,
            ]);

            $this->recalculateCustomerDebt($data['customer_id']);

            return $payment;
        });
    }

    public function deletePayment(int $id): void
    {
        DB::transaction(function () use ($id) {
            $payment = $this->model->findOrFail($id);
            $customerId = $payment->customer_id;
            $payment->delete();
            $this->recalculateCustomerDebt($customerId);
        });
    }

    private function recalculateCustomerDebt(int $customerId): void
    {
        if ($customerId === 1) return;

        $customer = \App\Models\Customer::find($customerId);
        if (!$customer) return;

        $totalPurchases = \App\Models\Invoice::where('customer_id', $customerId)->sum('total');
        $totalPaid      = $this->model->where('customer_id', $customerId)->sum('amount');
        $totalSettled   = Settlement::where('customer_id', $customerId)->sum('amount');
        $totalDebt      = $totalPurchases - $totalPaid + $totalSettled;

        $customer->update([
            'total_debt'      => max(0, $totalDebt),
            'total_purchases' => $totalPurchases,
        ]);
    }
}
