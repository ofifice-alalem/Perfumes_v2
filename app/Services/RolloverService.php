<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceReturn;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\PeriodSnapshot;
use App\Models\PeriodSnapshotItem;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\WasteItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RolloverService
{
    public function getCurrentPeriodId(): ?int
    {
        return AccountingPeriod::where('status', 'open')->value('id');
    }

    public function getCurrentPeriod(): ?AccountingPeriod
    {
        return AccountingPeriod::where('status', 'open')->first();
    }

    /**
     * Calculate snapshot data without saving — used for preview.
     */
    public function previewSnapshot(): array
    {
        $periodId = $this->getCurrentPeriodId();

        return [
            'customers'       => $this->buildCustomerBalances($periodId),
            'suppliers'       => $this->buildSupplierBalances($periodId),
            'products'        => $this->buildProductStocks(),
            'payment_methods' => $this->buildPaymentMethodBalances($periodId),
            'stats'           => $this->buildStats($periodId),
        ];
    }

    /**
     * Execute the full rollover inside a single DB transaction.
     */
    public function executeRollover(string $newPeriodName, ?string $notes = null): AccountingPeriod
    {
        return DB::transaction(function () use ($newPeriodName, $notes) {
            $current = AccountingPeriod::where('status', 'open')->lockForUpdate()->firstOrFail();
            $userId  = Auth::id();

            // Step 1: Build snapshot data
            $periodId         = $current->id;
            $customerBalances = $this->buildCustomerBalances($periodId);
            $supplierBalances = $this->buildSupplierBalances($periodId);
            $productStocks    = $this->buildProductStocks();
            $pmBalances       = $this->buildPaymentMethodBalances($periodId);
            $stats            = $this->buildStats($periodId);

            // Step 2: Save snapshot
            $snapshot = PeriodSnapshot::create([
                'period_id'   => $periodId,
                'snapshot_at' => now(),
                'created_by'  => $userId,
                'notes'       => $notes,
                'created_at'  => now(),
            ]);

            $items = [];
            $now   = now()->toDateTimeString();

            foreach ($customerBalances as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'customer', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['balance'], 'created_at' => $now];
            }
            foreach ($supplierBalances as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'supplier', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['balance'], 'created_at' => $now];
            }
            foreach ($productStocks as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'product_stock', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['stock'], 'created_at' => $now];
            }
            foreach ($pmBalances as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'payment_method', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['balance'], 'created_at' => $now];
            }
            foreach ($stats as $type => $value) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => $type, 'entity_id' => null, 'entity_name' => null, 'balance' => $value, 'created_at' => $now];
            }

            PeriodSnapshotItem::insert($items);

            // Step 3: Update opening balances
            foreach ($customerBalances as $row) {
                Customer::where('id', $row['id'])->update(['opening_balance' => $row['balance']]);
            }
            foreach ($supplierBalances as $row) {
                Supplier::where('id', $row['id'])->update(['opening_balance' => $row['balance']]);
            }

            // Step 4: Close current period
            $current->update([
                'status'    => 'closed',
                'closed_at' => now(),
            ]);

            // Step 5: Open new period
            $newPeriod = AccountingPeriod::create([
                'name'       => $newPeriodName,
                'started_at' => now(),
                'status'     => 'open',
                'created_by' => $userId,
            ]);

            return $newPeriod;
        });
    }

    /**
     * Purge all transactional data for a closed period (snapshot must exist).
     */
    public function purgePeriod(int $periodId): void
    {
        $period = AccountingPeriod::findOrFail($periodId);

        if ($period->status !== 'closed') {
            throw new \RuntimeException('لا يمكن حذف بيانات فترة مفتوحة');
        }

        if (! $period->snapshot()->exists()) {
            throw new \RuntimeException('لا يوجد Snapshot لهذه الفترة — لا يمكن الحذف');
        }

        DB::transaction(function () use ($periodId) {
            $tables = [
                'invoice_return_items', 'invoice_returns',
                'settlements', 'payments', 'invoice_items', 'invoices',
                'purchase_return_items', 'purchase_returns',
                'supplier_settlements', 'supplier_payments', 'purchase_items', 'purchases',
                'waste_items', 'waste_logs',
            ];

            foreach ($tables as $table) {
                DB::table($table)->where('period_id', $periodId)->delete();
            }
        });
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function buildCustomerBalances(?int $periodId): array
    {
        return Customer::select('id', 'name', 'total_debt as balance')
            ->get()
            ->map(fn($c) => ['id' => $c->id, 'name' => $c->name, 'balance' => (float) $c->total_debt])
            ->toArray();
    }

    private function buildSupplierBalances(?int $periodId): array
    {
        return Supplier::select('id', 'name', 'total_debt as balance')
            ->get()
            ->map(fn($s) => ['id' => $s->id, 'name' => $s->name, 'balance' => (float) $s->total_debt])
            ->toArray();
    }

    private function buildProductStocks(): array
    {
        return Product::select('id', 'name', 'stock')
            ->get()
            ->map(fn($p) => ['id' => $p->id, 'name' => $p->name, 'stock' => (float) $p->stock])
            ->toArray();
    }

    private function buildPaymentMethodBalances(?int $periodId): array
    {
        $paid_in  = Payment::when($periodId, fn($q) => $q->where('period_id', $periodId))
            ->select('payment_method_id', DB::raw('SUM(amount) as total'))
            ->groupBy('payment_method_id')
            ->pluck('total', 'payment_method_id');

        $paid_out = SupplierPayment::when($periodId, fn($q) => $q->where('period_id', $periodId))
            ->select('payment_method_id', DB::raw('SUM(amount) as total'))
            ->groupBy('payment_method_id')
            ->pluck('total', 'payment_method_id');

        return PaymentMethod::select('id', 'name')->get()
            ->map(fn($pm) => [
                'id'      => $pm->id,
                'name'    => $pm->name,
                'balance' => (float) ($paid_in[$pm->id] ?? 0) - (float) ($paid_out[$pm->id] ?? 0),
            ])
            ->toArray();
    }

    private function buildStats(?int $periodId): array
    {
        $q = fn($model) => $model::when($periodId, fn($q) => $q->where('period_id', $periodId));

        $totalWaste = WasteItem::when($periodId, fn($q) => $q->where('period_id', $periodId))
            ->join('products', 'waste_items.product_id', '=', 'products.id')
            ->leftJoin(
                \Illuminate\Support\Facades\DB::raw('(SELECT product_id, MAX(unit_cost) as unit_cost FROM purchase_items GROUP BY product_id) as last_cost'),
                'waste_items.product_id', '=', 'last_cost.product_id'
            )
            ->selectRaw('SUM(waste_items.quantity * COALESCE(last_cost.unit_cost, 0)) as total')
            ->value('total') ?? 0;

        return [
            'total_sales'      => (float) $q(Invoice::class)->sum('total'),
            'total_purchases'  => (float) $q(Purchase::class)->sum('total'),
            'total_returns_in' => (float) $q(InvoiceReturn::class)->sum('total'),
            'total_returns_out'=> (float) $q(PurchaseReturn::class)->sum('total'),
            'total_waste'      => (float) $totalWaste,
            'total_paid_in'    => (float) $q(Payment::class)->sum('amount'),
            'total_paid_out'   => (float) $q(SupplierPayment::class)->sum('amount'),
            'invoices_count'   => $q(Invoice::class)->count(),
            'purchases_count'  => $q(Purchase::class)->count(),
            'new_customers'    => Customer::when(
                $periodId,
                fn($q) => $q->whereHas('invoices', fn($q2) => $q2->where('period_id', $periodId))
            )->count(),
        ];
    }
}
