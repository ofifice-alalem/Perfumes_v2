<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceReturn;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\PeriodSnapshot;
use App\Models\PeriodSnapshotDailyProfit;
use App\Models\PeriodSnapshotItem;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\WasteItem;
use App\Repositories\Contracts\ReportRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RolloverService
{
    public function __construct(private ReportRepositoryInterface $reports) {}

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
        $current  = $this->getCurrentPeriod();

        $dateFrom = $current?->started_at->toDateString();
        $dateTo   = now()->toDateString();

        return [
            'customers'              => $this->buildCustomerBalances($periodId),
            'suppliers'              => $this->buildSupplierBalances($periodId),
            'products'               => $this->buildProductStocks(),
            'opening_stock'          => $this->buildOpeningStock(),
            'waste_products'         => $this->buildWasteProducts($periodId),
            'purchased_products'     => $this->buildPurchasedProducts($periodId),
            'sold_products'          => $this->buildSoldProducts($periodId),
            'customer_return_products' => $this->buildCustomerReturnProducts($periodId),
            'supplier_return_products' => $this->buildSupplierReturnProducts($periodId),
            'payment_methods'        => $this->buildPaymentMethodBalances($periodId),
            'stats'                  => $this->buildStats($periodId),
            'profit_summary'         => $this->reports->dailyProfitSummary($dateFrom, $dateTo, null, $periodId),
            'stock_profit_data'      => $this->reports->stockStatus(null, null, false, true, true, true, $dateFrom, $dateTo, null, $periodId),
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
            $customerBalances       = $this->buildCustomerBalances($periodId);
            $supplierBalances       = $this->buildSupplierBalances($periodId);
            $productStocks          = $this->buildProductStocks();
            $openingStock           = $this->buildOpeningStock();
            $wasteProducts          = $this->buildWasteProducts($periodId);
            $purchasedProducts      = $this->buildPurchasedProducts($periodId);
            $soldProducts           = $this->buildSoldProducts($periodId);
            $customerReturnProducts = $this->buildCustomerReturnProducts($periodId);
            $supplierReturnProducts = $this->buildSupplierReturnProducts($periodId);
            $pmBalances             = $this->buildPaymentMethodBalances($periodId);
            $stats                  = $this->buildStats($periodId);

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
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'product_stock',    'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['stock'],    'created_at' => $now];
            }
            foreach ($openingStock as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'opening_stock',    'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['quantity'], 'created_at' => $now];
            }
            foreach ($wasteProducts as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'waste_product',     'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['quantity'], 'created_at' => $now];
            }
            foreach ($purchasedProducts as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'purchased_product', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['quantity'], 'created_at' => $now];
            }
            foreach ($soldProducts as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'sold_product',           'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['quantity'], 'created_at' => $now];
            }
            foreach ($customerReturnProducts as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'customer_return_product', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['quantity'], 'created_at' => $now];
            }
            foreach ($supplierReturnProducts as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'supplier_return_product', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['quantity'], 'created_at' => $now];
            }
            foreach ($pmBalances as $row) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => 'payment_method', 'entity_id' => $row['id'], 'entity_name' => $row['name'], 'balance' => $row['balance'], 'created_at' => $now];
            }
            foreach ($stats as $type => $value) {
                $items[] = ['snapshot_id' => $snapshot->id, 'type' => $type, 'entity_id' => null, 'entity_name' => null, 'balance' => $value, 'created_at' => $now];
            }

            PeriodSnapshotItem::insert($items);

            // Save daily profit data
            $dateFrom     = $current->started_at->toDateString();
            $dateTo       = now()->toDateString();
            $profitSummary = $this->reports->dailyProfitSummary($dateFrom, $dateTo, null, $periodId);
            $dailyRows = [];
            foreach ($profitSummary['monthly'] as $month) {
                foreach ($month['days'] as $day) {
                    $dailyRows[] = [
                        'snapshot_id' => $snapshot->id,
                        'date'        => $day['date'],
                        'sales'       => $day['sales'],
                        'returns'     => $day['returns'],
                        'net_sales'   => $day['net_sales'],
                        'profit'      => $day['profit'],
                    ];
                }
            }
            if (!empty($dailyRows)) {
                PeriodSnapshotDailyProfit::insert($dailyRows);
            }

            // Save stock profit data
            $stockProfitData = $this->reports->stockStatus(null, null, false, true, true, true, $dateFrom, $dateTo, null, $periodId);
            $stockProfitRows = [];
            foreach ($stockProfitData as $sp) {
                $stockProfitRows[] = [
                    'snapshot_id'          => $snapshot->id,
                    'product_id'           => $sp['id'],
                    'product_name'         => $sp['name'],
                    'category_name'        => $sp['category'],
                    'unit'                 => $sp['unit'],
                    'stock'                => $sp['stock'] ?? 0,
                    'total_purchased'      => $sp['total_purchased'],
                    'total_sold'           => $sp['total_sold'],
                    'total_wasted'         => $sp['total_wasted'],
                    'total_return_in'      => $sp['total_return_in'],
                    'avg_return_in_price'  => $sp['avg_return_in_price'],
                    'total_return_out'     => $sp['total_return_out'],
                    'avg_return_out_price' => $sp['avg_return_out_price'],
                    'net_sale_qty'         => $sp['net_sale_qty'],
                    'avg_purchase_cost'    => $sp['avg_purchase_cost'],
                    'avg_sale_price'       => $sp['avg_sale_price'],
                    'profit'               => $sp['profit'],
                ];
            }
            if (!empty($stockProfitRows)) {
                \App\Models\PeriodSnapshotStockProfit::insert($stockProfitRows);
            }

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

            // ── Recalculate customer totals from remaining live data ──────────
            $customerStats = DB::table('customers')
                ->leftJoin(DB::raw('(SELECT customer_id, SUM(total) as t FROM invoices WHERE deleted_at IS NULL GROUP BY customer_id) as inv'), 'customers.id', '=', 'inv.customer_id')
                ->leftJoin(DB::raw('(SELECT customer_id, SUM(total) as t FROM invoice_returns WHERE deleted_at IS NULL GROUP BY customer_id) as ret'), 'customers.id', '=', 'ret.customer_id')
                ->leftJoin(DB::raw('(SELECT customer_id, SUM(amount) as t FROM payments GROUP BY customer_id) as pay'), 'customers.id', '=', 'pay.customer_id')
                ->leftJoin(DB::raw('(SELECT customer_id, SUM(amount) as t FROM settlements GROUP BY customer_id) as set_'), 'customers.id', '=', 'set_.customer_id')
                ->select(
                    'customers.id',
                    DB::raw('COALESCE(inv.t, 0) as total_purchases'),
                    DB::raw('COALESCE(ret.t, 0) as total_returns'),
                    DB::raw('COALESCE(pay.t, 0) as total_paid'),
                    DB::raw('COALESCE(set_.t, 0) as total_settlements')
                )
                ->get();

            foreach ($customerStats as $s) {
                $debt = $s->total_purchases
                    - $s->total_returns
                    - $s->total_paid
                    - $s->total_settlements
                    + (float) DB::table('customers')->where('id', $s->id)->value('opening_balance');

                DB::table('customers')->where('id', $s->id)->update([
                    'total_purchases'   => $s->total_purchases,
                    'total_returns'     => $s->total_returns,
                    'total_paid'        => $s->total_paid,
                    'total_settlements' => $s->total_settlements,
                    'total_debt'        => max(0, $debt),
                ]);
            }

            // ── Recalculate supplier totals from remaining live data ──────────
            $supplierStats = DB::table('suppliers')
                ->leftJoin(DB::raw('(SELECT supplier_id, SUM(total) as t FROM purchases WHERE deleted_at IS NULL GROUP BY supplier_id) as pur'), 'suppliers.id', '=', 'pur.supplier_id')
                ->leftJoin(DB::raw('(SELECT supplier_id, SUM(total) as t FROM purchase_returns WHERE deleted_at IS NULL GROUP BY supplier_id) as ret'), 'suppliers.id', '=', 'ret.supplier_id')
                ->leftJoin(DB::raw('(SELECT supplier_id, SUM(amount) as t FROM supplier_payments GROUP BY supplier_id) as pay'), 'suppliers.id', '=', 'pay.supplier_id')
                ->leftJoin(DB::raw('(SELECT supplier_id, SUM(amount) as t FROM supplier_settlements GROUP BY supplier_id) as set_'), 'suppliers.id', '=', 'set_.supplier_id')
                ->select(
                    'suppliers.id',
                    DB::raw('COALESCE(pur.t, 0) as total_purchases'),
                    DB::raw('COALESCE(ret.t, 0) as total_returns'),
                    DB::raw('COALESCE(pay.t, 0) as total_paid'),
                    DB::raw('COALESCE(set_.t, 0) as total_settlements')
                )
                ->get();

            foreach ($supplierStats as $s) {
                $debt = $s->total_purchases
                    - $s->total_returns
                    - $s->total_paid
                    - $s->total_settlements
                    + (float) DB::table('suppliers')->where('id', $s->id)->value('opening_balance');

                DB::table('suppliers')->where('id', $s->id)->update([
                    'total_purchases'   => $s->total_purchases,
                    'total_returns'     => $s->total_returns,
                    'total_paid'        => $s->total_paid,
                    'total_settlements' => $s->total_settlements,
                    'total_debt'        => max(0, $debt),
                ]);
            }
        });
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function buildCustomerBalances(?int $periodId): array
    {
        return Customer::select('id', 'name', 'total_debt')
            ->get()
            ->map(fn($c) => ['id' => $c->id, 'name' => $c->name, 'balance' => (float) $c->total_debt])
            ->toArray();
    }

    private function buildSupplierBalances(?int $periodId): array
    {
        return Supplier::select('id', 'name', 'total_debt')
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

    /**
     * Opening stock = product_stock items from the last closed period's snapshot.
     * If no previous period exists (first ever rollover), returns 0 for all products.
     */
    private function buildOpeningStock(): array
    {
        $lastSnapshot = PeriodSnapshot::whereHas('period', fn($q) => $q->where('status', 'closed'))
            ->latest('snapshot_at')
            ->first();

        if (! $lastSnapshot) {
            // First period — opening stock is 0 for all products
            return Product::select('id', 'name')
                ->get()
                ->map(fn($p) => ['id' => $p->id, 'name' => $p->name, 'quantity' => 0.0])
                ->toArray();
        }

        // Get product_stock items from the last snapshot
        $snapshotStocks = $lastSnapshot->items()
            ->where('type', 'product_stock')
            ->get()
            ->keyBy('entity_id');

        return Product::select('id', 'name')
            ->get()
            ->map(fn($p) => [
                'id'       => $p->id,
                'name'     => $p->name,
                'quantity' => (float) ($snapshotStocks[$p->id]->balance ?? 0),
            ])
            ->toArray();
    }

    private function buildWasteProducts(?int $periodId): array
    {
        return WasteItem::where(fn($q) => $this->scopePeriod($q, $periodId))
            ->join('products', 'waste_items.product_id', '=', 'products.id')
            ->select('products.id', 'products.name', DB::raw('SUM(waste_items.quantity) as total_qty'))
            ->groupBy('products.id', 'products.name')
            ->get()
            ->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'quantity' => (float) $r->total_qty])
            ->toArray();
    }

    private function buildPurchasedProducts(?int $periodId): array
    {
        return \App\Models\PurchaseItem::where(fn($q) => $this->scopePeriod($q, $periodId, 'purchase_items'))
            ->join('products', 'purchase_items.product_id', '=', 'products.id')
            ->join('purchases', 'purchase_items.purchase_id', '=', 'purchases.id')
            ->whereNull('purchases.deleted_at')
            ->select('products.id', 'products.name', DB::raw('SUM(purchase_items.quantity) as total_qty'))
            ->groupBy('products.id', 'products.name')
            ->get()
            ->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'quantity' => (float) $r->total_qty])
            ->toArray();
    }

    private function buildSoldProducts(?int $periodId): array
    {
        return \App\Models\InvoiceItem::where(fn($q) => $this->scopePeriod($q, $periodId, 'invoice_items'))
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereNull('invoices.deleted_at')
            ->select('products.id', 'products.name', DB::raw('SUM(invoice_items.quantity) as total_qty'))
            ->groupBy('products.id', 'products.name')
            ->get()
            ->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'quantity' => (float) $r->total_qty])
            ->toArray();
    }

    private function buildCustomerReturnProducts(?int $periodId): array
    {
        return \App\Models\InvoiceReturnItem::where(fn($q) => $this->scopePeriod($q, $periodId, 'invoice_return_items'))
            ->join('products', 'invoice_return_items.product_id', '=', 'products.id')
            ->join('invoice_returns', 'invoice_return_items.invoice_return_id', '=', 'invoice_returns.id')
            ->whereNull('invoice_returns.deleted_at')
            ->select('products.id', 'products.name', DB::raw('SUM(invoice_return_items.quantity) as total_qty'))
            ->groupBy('products.id', 'products.name')
            ->get()
            ->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'quantity' => (float) $r->total_qty])
            ->toArray();
    }

    private function buildSupplierReturnProducts(?int $periodId): array
    {
        return \App\Models\PurchaseReturnItem::where(fn($q) => $this->scopePeriod($q, $periodId, 'purchase_return_items'))
            ->join('products', 'purchase_return_items.product_id', '=', 'products.id')
            ->join('purchase_returns', 'purchase_return_items.purchase_return_id', '=', 'purchase_returns.id')
            ->whereNull('purchase_returns.deleted_at')
            ->select('products.id', 'products.name', DB::raw('SUM(purchase_return_items.quantity) as total_qty'))
            ->groupBy('products.id', 'products.name')
            ->get()
            ->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'quantity' => (float) $r->total_qty])
            ->toArray();
    }
    private function buildPaymentMethodBalances(?int $periodId): array
    {
        $paid_in  = Payment::where(fn($q) => $this->scopePeriod($q, $periodId))
            ->select('payment_method_id', DB::raw('SUM(amount) as total'))
            ->groupBy('payment_method_id')
            ->pluck('total', 'payment_method_id');

        $paid_out = SupplierPayment::where(fn($q) => $this->scopePeriod($q, $periodId))
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
        $q = fn($model) => $model::where(fn($q) => $this->scopePeriod($q, $periodId));

        $totalWaste = WasteItem::where(fn($q) => $this->scopePeriod($q, $periodId))
            ->join('products', 'waste_items.product_id', '=', 'products.id')
            ->leftJoin(
                DB::raw('(SELECT product_id, SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0) as avg_cost FROM purchase_items GROUP BY product_id) as wavg_cost'),
                'waste_items.product_id', '=', 'wavg_cost.product_id'
            )
            ->selectRaw('SUM(waste_items.quantity * COALESCE(wavg_cost.avg_cost, 0)) as total')
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
            'new_customers'    => Customer::whereHas(
                'invoices',
                fn($q) => $this->scopePeriod($q, $periodId)
            )->count(),
        ];
    }

    /**
     * Scope a query to the given period:
     * - includes records with period_id = $periodId
     * - also includes legacy records with period_id = NULL (pre-Step-11 data)
     */
    private function scopePeriod($query, ?int $periodId, string $table = 'period_id'): void
    {
        if ($periodId === null) {
            return;
        }

        $col = str_contains($table, '.') || $table === 'period_id'
            ? 'period_id'
            : "{$table}.period_id";

        $query->where(fn($q) => $q
            ->where($col, $periodId)
            ->orWhereNull($col)
        );
    }
}
