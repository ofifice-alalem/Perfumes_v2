<?php

namespace App\Repositories;

use App\Repositories\Contracts\ReportRepositoryInterface;
use App\Services\Reports\ReportExcelExportService;
use App\Services\Reports\ReportPdfExportService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReportRepository implements ReportRepositoryInterface
{
    protected ReportExcelExportService $excelExporter;
    protected ReportPdfExportService $pdfExporter;

    public function __construct(
        ?ReportExcelExportService $excelExporter = null,
        ?ReportPdfExportService $pdfExporter = null
    ) {
        $this->excelExporter = $excelExporter ?? app(ReportExcelExportService::class);
        $this->pdfExporter = $pdfExporter ?? app(ReportPdfExportService::class);
    }

    public function productMovement(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type, ?int $limit = 30): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $dateFrom = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dateTo   = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        // ── حساب رصيد أول الفترة ──────────────────────────────────────────
        $currentStock = DB::table('products')->where('id', $productId)->value('stock') ?? 0;

        // كل الحركات من date_from (أو من البداية) حتى الآن (لطرحها من الرصيد الحالي)
        $purchasesAfter = DB::table('purchase_items')
            ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
            ->whereNull('purchases.deleted_at')
            ->where('purchase_items.product_id', $productId)
            ->when($dateFrom, fn($q) => $q->where('purchases.created_at', '>=', $dateFrom))
            ->sum('purchase_items.quantity');

        $salesAfter = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereNull('invoices.deleted_at')
            ->where('invoice_items.product_id', $productId)
            ->when($dateFrom, fn($q) => $q->where('invoices.created_at', '>=', $dateFrom))
            ->sum('invoice_items.quantity');

        $returnInAfter = DB::table('invoice_return_items')
            ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
            ->whereNull('invoice_returns.deleted_at')
            ->where('invoice_return_items.product_id', $productId)
            ->when($dateFrom, fn($q) => $q->where('invoice_returns.created_at', '>=', $dateFrom))
            ->sum('invoice_return_items.quantity');

        $returnOutAfter = DB::table('purchase_return_items')
            ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
            ->whereNull('purchase_returns.deleted_at')
            ->where('purchase_return_items.product_id', $productId)
            ->when($dateFrom, fn($q) => $q->where('purchase_returns.created_at', '>=', $dateFrom))
            ->sum('purchase_return_items.quantity');

        $wasteAfter = DB::table('waste_items')
            ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
            ->where('waste_items.product_id', $productId)
            ->when($dateFrom, fn($q) => $q->where('waste_logs.created_at', '>=', $dateFrom))
            ->sum('waste_items.quantity');

        $openingStock = $currentStock
            - $purchasesAfter
            + $salesAfter
            - $returnInAfter
            + $returnOutAfter
            + $wasteAfter;

        // ── جمع الحركات ───────────────────────────────────────────────────
        $movements = collect();

        // 1. مشتريات
        if (!$type || $type === 'purchase') {
            $rows = DB::table('purchase_items')
                ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
                ->whereNull('purchases.deleted_at')
                ->where('purchase_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('purchases.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('purchases.created_at', '<=', $dateTo))
                ->select(
                    'purchases.created_at as date',
                    DB::raw("'purchase' as type"),
                    'purchase_items.quantity',
                    'purchase_items.unit_cost as unit_price',
                    DB::raw("CONCAT('PO#', purchases.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 2. مبيعات
        if (!$type || $type === 'sale') {
            $rows = DB::table('invoice_items')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->whereNull('invoices.deleted_at')
                ->where('invoice_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('invoices.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('invoices.created_at', '<=', $dateTo))
                ->select(
                    'invoices.created_at as date',
                    DB::raw("'sale' as type"),
                    DB::raw('-invoice_items.quantity as quantity'),
                    'invoice_items.unit_price',
                    DB::raw("CONCAT('INV#', invoices.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 3. مرتجعات عملاء (دخول)
        if (!$type || $type === 'return_in') {
            $rows = DB::table('invoice_return_items')
                ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
                ->whereNull('invoice_returns.deleted_at')
                ->where('invoice_return_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('invoice_returns.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('invoice_returns.created_at', '<=', $dateTo))
                ->select(
                    'invoice_returns.created_at as date',
                    DB::raw("'return_in' as type"),
                    'invoice_return_items.quantity',
                    'invoice_return_items.unit_price',
                    DB::raw("CONCAT('RET#', invoice_returns.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 4. مرتجعات موردين (خروج)
        if (!$type || $type === 'return_out') {
            $rows = DB::table('purchase_return_items')
                ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
                ->whereNull('purchase_returns.deleted_at')
                ->where('purchase_return_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('purchase_returns.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('purchase_returns.created_at', '<=', $dateTo))
                ->select(
                    'purchase_returns.created_at as date',
                    DB::raw("'return_out' as type"),
                    DB::raw('-purchase_return_items.quantity as quantity'),
                    'purchase_return_items.unit_cost as unit_price',
                    DB::raw("CONCAT('PRET#', purchase_returns.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // 5. تالف (خروج)
        if (!$type || $type === 'waste') {
            $rows = DB::table('waste_items')
                ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
                ->where('waste_items.product_id', $productId)
                ->when($dateFrom, fn($q) => $q->where('waste_logs.created_at', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('waste_logs.created_at', '<=', $dateTo))
                ->select(
                    'waste_logs.created_at as date',
                    DB::raw("'waste' as type"),
                    DB::raw('-waste_items.quantity as quantity'),
                    DB::raw('NULL as unit_price'),
                    DB::raw("CONCAT('WST#', waste_logs.id) as reference")
                )
                ->get();
            $movements = $movements->merge($rows);
        }

        // ── ترتيب زمني + حساب الرصيد التراكمي ───────────────────────────
        $sorted  = $movements->sortBy('date')->values();
        
        $openingDate = $dateFrom;
        $openingRef = 'رصيد افتتاحي';
        $openingUnitPrice = null;

        if (!$dateFrom) {
            $latestSnapshot = DB::table('period_snapshots')
                ->join('accounting_periods', 'accounting_periods.id', '=', 'period_snapshots.period_id')
                ->orderBy('period_snapshots.id', 'desc')
                ->select('period_snapshots.id', 'accounting_periods.name', 'accounting_periods.closed_at', 'period_snapshots.created_at')
                ->first();
            
            if ($latestSnapshot) {
                $openingDate = $latestSnapshot->closed_at ?? $latestSnapshot->created_at;
                $openingRef = 'إقفال ' . $latestSnapshot->name;

                $snapshotProfit = DB::table('period_snapshot_stock_profits')
                    ->where('snapshot_id', $latestSnapshot->id)
                    ->where('product_id', $productId)
                    ->first();
                if ($snapshotProfit && $snapshotProfit->avg_purchase_cost !== null) {
                    $openingUnitPrice = (float) $snapshotProfit->avg_purchase_cost;
                }
            } else {
                $firstMovementDate = $sorted->first()->date ?? now()->format('Y-m-d H:i:s');
                $openingDate = \Carbon\Carbon::parse($firstMovementDate)->subSecond()->format('Y-m-d H:i:s');
            }
        } else {
            $openingDate = \Carbon\Carbon::parse($dateFrom)->subSecond()->format('Y-m-d H:i:s');

            $latestSnapshotBeforeDate = DB::table('period_snapshots')
                ->where('created_at', '<=', $dateFrom . ' 23:59:59')
                ->orderBy('id', 'desc')
                ->first();
            
            if ($latestSnapshotBeforeDate) {
                $snapshotProfit = DB::table('period_snapshot_stock_profits')
                    ->where('snapshot_id', $latestSnapshotBeforeDate->id)
                    ->where('product_id', $productId)
                    ->first();
                if ($snapshotProfit && $snapshotProfit->avg_purchase_cost !== null) {
                    $openingUnitPrice = (float) $snapshotProfit->avg_purchase_cost;
                }
            }
        }

        $sorted->prepend((object)[
            'date' => $openingDate,
            'type' => 'opening_balance',
            'quantity' => (float) $openingStock,
            'unit_price' => $openingUnitPrice,
            'reference' => $openingRef
        ]);

        $balance = 0.0;

        $result = $sorted->map(function ($row) use (&$balance) {
            $balance += (float) $row->quantity;
            return [
                'date'       => $row->date,
                'type'       => $row->type,
                'quantity'   => (float) $row->quantity,
                'unit_price' => $row->unit_price !== null ? (float) $row->unit_price : null,
                'reference'  => $row->reference,
                'balance'    => round($balance, 2),
            ];
        });

        $allMovements = $result->values();
        $totalMovementsCount = count($allMovements);
        $slicedMovements = $limit !== null ? $allMovements->take($limit)->all() : $allMovements->all();

        return [
            'opening_stock'         => round((float) $openingStock, 2),
            'movements'             => $slicedMovements,
            'total_movements_count' => $totalMovementsCount,
            'closing_stock'         => round($balance, 2),
        ];
    }


    public function loadMoreProductMovements(
        int $productId,
        int $offset = 30,
        int $limit = 30,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?string $type = null
    ): array {
        $full = $this->productMovement($productId, $dateFrom, $dateTo, $type, null);
        $allMovements = $full['movements'] ?? [];
        $total = count($allMovements);
        $slice = array_slice($allMovements, $offset, $limit);
        $nextOffset = $offset + count($slice);
        $hasMore = $nextOffset < $total;

        return [
            'movements'   => $slice,
            'has_more'    => $hasMore,
            'next_offset' => $nextOffset,
        ];
    }

    // ─── Excel ───────────────────────────────────────────────────────────────


    public function exportProductMovementExcel(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type): void
    {
        $this->excelExporter->exportProductMovementExcel($this, $productId, $dateFrom, $dateTo, $type);
    }

    public function exportProductMovementPdf(int $productId, ?string $dateFrom, ?string $dateTo, ?string $type, ?int $limit = 500, ?int $offset = 0): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportProductMovementPdf($this, $productId, $dateFrom, $dateTo, $type, $limit, $offset);
    }

    public function stockStatus(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, ?array $filterProductIds = null, ?int $periodId = null, ?string $searchName = null): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $scopePeriod = function ($q, string $table) use ($periodId) {
            if ($periodId) {
                $q->where(fn($sq) => $sq->where("{$table}.period_id", $periodId)->orWhereNull("{$table}.period_id"));
            }
        };

        $query = DB::table('products')
            ->when(!empty($filterProductIds) || $searchName, function ($q) use ($filterProductIds, $searchName) {
                $q->where(function ($sq) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sq->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $searchNames = explode(',', $searchName);
                        foreach ($searchNames as $name) {
                            $sq->orWhere('products.name', 'like', '%' . trim($name) . '%');
                        }
                    }
                });
            })
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->leftJoin('price_tiers', 'price_tiers.id', '=', 'products.price_tier_id')
            ->when($categoryId,   fn($q) => $q->where('products.category_id', $categoryId))
            ->when($sellingType,  fn($q) => $q->where('products.selling_type', $sellingType))
            ->when($lowStockOnly, fn($q) => $q->whereRaw('products.stock <= products.min_stock'))
            ->select(
                'products.id',
                'products.name',
                'products.stock',
                'products.min_stock',
                'products.selling_type',
                'categories.name as category_name',
                'categories.unit',
                'price_tiers.name as tier_name',
            )
            ->orderBy('products.name')
            ->get();

        $productIds = $query->pluck('id')->toArray();
        if (empty($productIds)) return [];

        $previousSnapshotId = null;
        if ($periodId) {
            $previousSnapshotId = DB::table('period_snapshots')->where('period_id', '<', $periodId)->orderBy('period_id', 'desc')->value('id');
        } else {
            $previousSnapshotId = DB::table('period_snapshots')->orderBy('id', 'desc')->value('id');
        }

        $fallbackCosts = [];
        $fallbackStocks = [];
        if ($previousSnapshotId) {
            $stockProfits = DB::table('period_snapshot_stock_profits')
                ->where('snapshot_id', $previousSnapshotId)
                ->whereIn('product_id', $productIds)
                ->get(['product_id', 'avg_purchase_cost', 'stock']);
            foreach ($stockProfits as $sp) {
                if ($sp->avg_purchase_cost !== null) $fallbackCosts[$sp->product_id] = (float) $sp->avg_purchase_cost;
                $fallbackStocks[$sp->product_id] = (float) $sp->stock;
            }
        }

        $dateFromFull = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dateToFull   = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        // Fetch Aggregated data in 5 queries instead of 18,000
        $purchasedAgg = DB::table('purchase_items')
            ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
            ->whereNull('purchases.deleted_at')
            ->whereIn('purchase_items.product_id', $productIds)
            ->when($dateToFull, fn($q) => $q->where('purchases.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'purchases'))
            ->select('purchase_items.product_id', DB::raw('SUM(purchase_items.quantity) as qty'), DB::raw('SUM(purchase_items.line_total) as val'),
                DB::raw('SUM(CASE WHEN '.($dateFromFull ? "'$dateFromFull' <= purchases.created_at" : '1').' THEN purchase_items.quantity ELSE 0 END) as qty_in_range'),
                DB::raw('SUM(CASE WHEN '.($dateFromFull ? "'$dateFromFull' <= purchases.created_at" : '1').' THEN purchase_items.line_total ELSE 0 END) as val_in_range')
            )
            ->groupBy('purchase_items.product_id')
            ->get()->keyBy('product_id');

        $returnOutAgg = DB::table('purchase_return_items')
            ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
            ->whereNull('purchase_returns.deleted_at')
            ->whereIn('purchase_return_items.product_id', $productIds)
            ->when($dateToFull, fn($q) => $q->where('purchase_returns.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'purchase_returns'))
            ->select('purchase_return_items.product_id', DB::raw('SUM(purchase_return_items.quantity) as qty'), DB::raw('SUM(purchase_return_items.line_total) as val'),
                DB::raw('SUM(CASE WHEN '.($dateFromFull ? "'$dateFromFull' <= purchase_returns.created_at" : '1').' THEN purchase_return_items.quantity ELSE 0 END) as qty_in_range'),
                DB::raw('SUM(CASE WHEN '.($dateFromFull ? "'$dateFromFull' <= purchase_returns.created_at" : '1').' THEN purchase_return_items.line_total ELSE 0 END) as val_in_range')
            )
            ->groupBy('purchase_return_items.product_id')
            ->get()->keyBy('product_id');

        $soldAgg = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereNull('invoices.deleted_at')
            ->whereIn('invoice_items.product_id', $productIds)
            ->when($dateFromFull, fn($q) => $q->where('invoices.created_at', '>=', $dateFromFull))
            ->when($dateToFull,   fn($q) => $q->where('invoices.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'invoices'))
            ->select('invoice_items.product_id', DB::raw('SUM(invoice_items.quantity) as qty'), DB::raw('SUM(invoice_items.line_total) as val'))
            ->groupBy('invoice_items.product_id')
            ->get()->keyBy('product_id');

        $returnInAgg = DB::table('invoice_return_items')
            ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
            ->whereNull('invoice_returns.deleted_at')
            ->whereIn('invoice_return_items.product_id', $productIds)
            ->when($dateFromFull, fn($q) => $q->where('invoice_returns.created_at', '>=', $dateFromFull))
            ->when($dateToFull,   fn($q) => $q->where('invoice_returns.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'invoice_returns'))
            ->select('invoice_return_items.product_id', DB::raw('SUM(invoice_return_items.quantity) as qty'), DB::raw('SUM(invoice_return_items.line_total) as val'))
            ->groupBy('invoice_return_items.product_id')
            ->get()->keyBy('product_id');

        $wastedAgg = null;
        if ($showWasted) {
            $wastedAgg = DB::table('waste_items')
                ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
                ->whereIn('waste_items.product_id', $productIds)
                ->when($dateFromFull, fn($q) => $q->where('waste_logs.created_at', '>=', $dateFromFull))
                ->when($dateToFull,   fn($q) => $q->where('waste_logs.created_at', '<=', $dateToFull))
                ->tap(fn($q) => $scopePeriod($q, 'waste_logs'))
                ->select('waste_items.product_id', DB::raw('SUM(waste_items.quantity) as qty'))
                ->groupBy('waste_items.product_id')
                ->get()->keyBy('product_id');
        }

        // Timeline for Profit and Last Prices
        $events = [];
        $purchasesForProfit = DB::table('purchase_items')
            ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
            ->whereNull('purchases.deleted_at')
            ->whereIn('purchase_items.product_id', $productIds)
            ->when($dateToFull, fn($q) => $q->where('purchases.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'purchases'))
            ->select('purchase_items.product_id as pid', 'purchase_items.quantity as qty', 'purchase_items.line_total as val', 'purchases.created_at as date', 'purchases.id')
            ->get();
        foreach ($purchasesForProfit as $row) $events[] = ['date' => $row->date, 'type' => 1, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'id' => $row->id];

        $salesForProfit = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereNull('invoices.deleted_at')
            ->whereIn('invoice_items.product_id', $productIds)
            ->when($dateToFull, fn($q) => $q->where('invoices.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'invoices'))
            ->select('invoice_items.product_id as pid', 'invoice_items.quantity as qty', 'invoice_items.line_total as val', 'invoice_items.unit_price', 'invoices.created_at as date', 'invoices.id')
            ->get();
        foreach ($salesForProfit as $row) $events[] = ['date' => $row->date, 'type' => 2, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'unit_price' => (float)$row->unit_price, 'id' => $row->id];

        $returnsInForProfit = DB::table('invoice_return_items')
            ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
            ->whereNull('invoice_returns.deleted_at')
            ->whereIn('invoice_return_items.product_id', $productIds)
            ->when($dateToFull, fn($q) => $q->where('invoice_returns.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'invoice_returns'))
            ->select('invoice_return_items.product_id as pid', 'invoice_return_items.quantity as qty', 'invoice_return_items.line_total as val', 'invoice_returns.created_at as date', 'invoice_returns.id')
            ->get();
        foreach ($returnsInForProfit as $row) $events[] = ['date' => $row->date, 'type' => 3, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'id' => $row->id];

        $returnsOutForProfit = DB::table('purchase_return_items')
            ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
            ->whereNull('purchase_returns.deleted_at')
            ->whereIn('purchase_return_items.product_id', $productIds)
            ->when($dateToFull, fn($q) => $q->where('purchase_returns.created_at', '<=', $dateToFull))
            ->tap(fn($q) => $scopePeriod($q, 'purchase_returns'))
            ->select('purchase_return_items.product_id as pid', 'purchase_return_items.quantity as qty', 'purchase_return_items.line_total as val', 'purchase_returns.created_at as date', 'purchase_returns.id')
            ->get();
        foreach ($returnsOutForProfit as $row) $events[] = ['date' => $row->date, 'type' => 4, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'id' => $row->id];

        usort($events, function($a, $b) {
            if ($a['date'] != $b['date']) return $a['date'] <=> $b['date'];
            if ($a['type'] != $b['type']) return $a['type'] <=> $b['type'];
            return $a['id'] <=> $b['id'];
        });

        $productProfits = [];
        $lastPurchaseCosts = [];
        $lastSalePrices = [];
        $state = [];

        foreach ($events as $e) {
            $pid = $e['pid'];
            if (!isset($state[$pid])) {
                $state[$pid] = ['qty' => $fallbackStocks[$pid] ?? 0.0, 'val' => ($fallbackStocks[$pid] ?? 0.0) * ($fallbackCosts[$pid] ?? 0.0), 'cost' => $fallbackCosts[$pid] ?? 0.0];
                $productProfits[$pid] = 0;
            }
            $st = &$state[$pid];
            $inRange = (!$dateFromFull || $e['date'] >= $dateFromFull);

            if ($e['type'] === 1) { // Buy
                $st['qty'] += $e['qty'];
                $st['val'] += $e['val'];
                if ($st['qty'] > 0) $st['cost'] = $st['val'] / $st['qty'];
                if ($inRange) $lastPurchaseCosts[$pid] = $e['val'] / $e['qty'];
            } elseif ($e['type'] === 4) { // Buy Return
                $st['qty'] -= $e['qty'];
                $st['val'] -= $e['qty'] * ($e['val'] / $e['qty']);
                if ($st['qty'] > 0) $st['cost'] = $st['val'] / $st['qty'];
            } elseif ($e['type'] === 2) { // Sale
                $cogs = $e['qty'] * $st['cost'];
                $st['qty'] -= $e['qty'];
                $st['val'] -= $cogs;
                if ($inRange) {
                    $productProfits[$pid] += $e['val'] - $cogs;
                    $lastSalePrices[$pid] = $e['unit_price'];
                }
            } elseif ($e['type'] === 3) { // Sale Return
                $cor = $e['qty'] * $st['cost'];
                $st['qty'] += $e['qty'];
                $st['val'] += $cor;
                if ($inRange) $productProfits[$pid] -= $e['val'] - $cor;
            }
        }

        return $query->map(function ($p) use (
            $showSold, $showWasted, $showPurchased, $purchasedAgg, $returnOutAgg, $soldAgg, $returnInAgg, $wastedAgg,
            $fallbackCosts, $fallbackStocks, $productProfits, $lastPurchaseCosts, $lastSalePrices
        ) {
            $pId = $p->id;

            $totalPurchasedQty = (float)($purchasedAgg[$pId]->qty_in_range ?? 0);
            $totalPurchaseValue = (float)($purchasedAgg[$pId]->val_in_range ?? 0);
            $totalReturnOutQty = (float)($returnOutAgg[$pId]->qty_in_range ?? 0);
            $totalReturnOutValue = (float)($returnOutAgg[$pId]->val_in_range ?? 0);

            $histPurchasedQty = (float)($purchasedAgg[$pId]->qty ?? 0);
            $histPurchaseValue = (float)($purchasedAgg[$pId]->val ?? 0);
            $histReturnOutQty = (float)($returnOutAgg[$pId]->qty ?? 0);
            $histReturnOutValue = (float)($returnOutAgg[$pId]->val ?? 0);

            $openingQty = $fallbackStocks[$pId] ?? 0.0;
            $openingCost = $fallbackCosts[$pId] ?? 0.0;

            $netHistPurchaseQty = $histPurchasedQty - $histReturnOutQty + $openingQty;
            $totalHistValue = ($histPurchaseValue - $histReturnOutValue) + ($openingQty * $openingCost);

            $avgPurchaseCost = null;
            if ($netHistPurchaseQty > 0) {
                $avgPurchaseCost = $totalHistValue / $netHistPurchaseQty;
            } elseif ($openingCost > 0) {
                $avgPurchaseCost = $openingCost;
            }

            $lastPurchaseCost = $lastPurchaseCosts[$pId] ?? ($openingCost > 0 ? $openingCost : null);
            $lastSalePrice = $lastSalePrices[$pId] ?? null;

            $totalSoldQty = (float)($soldAgg[$pId]->qty ?? 0);
            $totalSaleValue = (float)($soldAgg[$pId]->val ?? 0);
            $totalReturnInQty = (float)($returnInAgg[$pId]->qty ?? 0);
            $totalReturnInValue = (float)($returnInAgg[$pId]->val ?? 0);

            $netSaleQty       = $totalSoldQty - $totalReturnInQty;
            $avgSalePrice     = $netSaleQty > 0 ? (($totalSaleValue - $totalReturnInValue) / $netSaleQty) : ($totalSoldQty > 0 ? ($totalSaleValue / $totalSoldQty) : null);
            $avgReturnInPrice = $totalReturnInQty > 0 ? ($totalReturnInValue / $totalReturnInQty) : null;
            $avgReturnOutPrice = $totalReturnOutQty > 0 ? ($totalReturnOutValue / $totalReturnOutQty) : null;

            $status = match(true) {
                (float)$p->stock <= 0                     => 'critical',
                (float)$p->stock <= (float)$p->min_stock  => 'warning',
                default                                   => 'ok',
            };

            $totalWasted = $showWasted ? (float)($wastedAgg[$pId]->qty ?? 0) : null;
            $profit = round($productProfits[$pId] ?? 0, 2);

            return [
                'id'                 => $p->id,
                'name'               => $p->name,
                'category'           => $p->category_name,
                'unit'               => $p->unit,
                'selling_type'       => $p->selling_type,
                'tier'               => $p->tier_name,
                'stock'              => (float)$p->stock,
                'min_stock'          => (float)$p->min_stock,
                'status'             => $status,
                'last_purchase_cost' => $lastPurchaseCost ? (float)$lastPurchaseCost : null,
                'avg_purchase_cost'  => $avgPurchaseCost  ? round((float)$avgPurchaseCost, 2) : null,
                'last_sale_price'    => $lastSalePrice    ? (float)$lastSalePrice    : null,
                'avg_sale_price'     => $avgSalePrice     ? round((float)$avgSalePrice, 2)    : null,
                'total_sold'         => $showSold ? $totalSoldQty : null,
                'net_sale_qty'       => $showSold ? $netSaleQty : null,
                'total_wasted'       => $totalWasted,
                'total_return_in'    => $showSold ? $totalReturnInQty : null,
                'avg_return_in_price'=> $showSold ? ($avgReturnInPrice ? round((float)$avgReturnInPrice, 2) : null) : null,
                'total_return_out'   => $showPurchased ? $totalReturnOutQty : null,
                'avg_return_out_price'=> $showPurchased ? ($avgReturnOutPrice !== null ? round((float)$avgReturnOutPrice, 2) : null) : null,
                'total_purchased'    => $showPurchased ? $totalPurchasedQty : null,
                'profit'             => $profit,
            ];
        })->values()->toArray();
    }


    public function exportStockStatusExcel(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, bool $compactView = false, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        $this->excelExporter->exportStockStatusExcel($this, $categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted, $showPurchased, $dateFrom, $dateTo, $compactView, $filterProductIds, $searchName);
    }

    public function exportStockStatusPdf(?int $categoryId, ?string $sellingType, bool $lowStockOnly, bool $showSold = false, bool $showWasted = false, bool $showPurchased = false, ?string $dateFrom = null, ?string $dateTo = null, bool $compactView = false, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportStockStatusPdf($this, $categoryId, $sellingType, $lowStockOnly, $showSold, $showWasted, $showPurchased, $dateFrom, $dateTo, $compactView, $filterProductIds, $searchName);
    }

    public function exportInventoryCountExcel(?int $categoryId, ?string $sellingType, bool $lowStockOnly): void
    {
        $this->excelExporter->exportInventoryCountExcel($this, $categoryId, $sellingType, $lowStockOnly);
    }

    public function exportInventoryCountPdf(?int $categoryId, ?string $sellingType, bool $lowStockOnly): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportInventoryCountPdf($this, $categoryId, $sellingType, $lowStockOnly);
    }

    public function customerAging(?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false, ?int $movementsLimitPerCustomer = 30): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        // If not showing all history and no dateFrom provided, default to the latest snapshot date
        $latestSnapshot = DB::table('period_snapshots')
            ->join('accounting_periods', 'accounting_periods.id', '=', 'period_snapshots.period_id')
            ->orderBy('period_snapshots.id', 'desc')
            ->select('accounting_periods.name', 'accounting_periods.closed_at', 'period_snapshots.created_at')
            ->first();

        $rolloverDate = $latestSnapshot ? ($latestSnapshot->closed_at ?? $latestSnapshot->created_at) : null;

        $dateFromQuery = null;
        if ($dateFrom) {
            $dateFromQuery = $dateFrom . ' 00:00:00';
        } elseif (!$showAllHistory && $rolloverDate) {
            $dateFromQuery = $rolloverDate;
        }
        $dateToQuery   = $dateTo   ? $dateTo   . ' 23:59:59' : now()->toDateTimeString();
        $dateToCarbon  = \Carbon\Carbon::parse($dateToQuery);

        $customersQuery = DB::table('customers')
            ->when($customerId, fn($q) => $q->where('id', $customerId))
            ->orderBy('name')
            ->get(['id', 'name', 'opening_balance', 'created_at']);

        if ($customersQuery->isEmpty()) return [];

        $customerIds = $customersQuery->pluck('id')->toArray();

        // Helper function to safely get chunks
        $getChunkedSums = function($table, $sumColumn, $dateCondition = null) use ($customerIds) {
            $sums = [];
            foreach (array_chunk($customerIds, 1000) as $chunk) {
                $query = DB::table($table)->whereNull('deleted_at')->whereIn('customer_id', $chunk);
                if ($dateCondition) $dateCondition($query);
                $query->groupBy('customer_id')->selectRaw("customer_id, SUM($sumColumn) as sum_val");
                foreach ($query->pluck('sum_val', 'customer_id') as $cid => $sum) {
                    $sums[$cid] = ($sums[$cid] ?? 0) + (float)$sum;
                }
            }
            return $sums;
        };

        // 1. True Current Debt (>= rolloverDate)
        $newInvoicedSums = $getChunkedSums('invoices', 'total', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);
        $newPaidSums = $getChunkedSums('payments', 'amount', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);
        $newSettledSums = $getChunkedSums('settlements', 'amount', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);
        $newReturnedSums = $getChunkedSums('invoice_returns', 'total', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);

        // 2. Report Date Range
        $totalInvoicedSums = $getChunkedSums('invoices', 'total', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));
        $totalPaidSums = $getChunkedSums('payments', 'amount', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $totalSettledSums = $getChunkedSums('settlements', 'amount', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $totalReturnedSums = $getChunkedSums('invoice_returns', 'total', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));

        // 3. Future Operations (>= dateFromQuery)
        $futureInvoicedSums = $getChunkedSums('invoices', 'total', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);
        $futurePaidSums = $getChunkedSums('payments', 'amount', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);
        $futureSettledSums = $getChunkedSums('settlements', 'amount', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);
        $futureReturnedSums = $getChunkedSums('invoice_returns', 'total', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);

        // Get movements
        $getChunkedMovements = function($table, $dateCondition) use ($customerIds) {
            $items = collect();
            foreach (array_chunk($customerIds, 1000) as $chunk) {
                $query = DB::table($table)->whereNull('deleted_at')->whereIn('customer_id', $chunk);
                if ($dateCondition) $dateCondition($query);
                $query->select('id as ref_id', 'customer_id', ($table == 'payments' || $table == 'settlements' ? 'amount' : 'total as amount'), 'created_at');
                $items = $items->merge($query->get());
            }
            return $items->groupBy('customer_id');
        };

        $loadMovements = true;

        $invoicesMovements = $getChunkedMovements('invoices', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));
        $paymentsMovements = $getChunkedMovements('payments', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $settlementsMovements = $getChunkedMovements('settlements', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $returnsMovements = $getChunkedMovements('invoice_returns', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));

        // Get Unpaid invoices for aging buckets
        $unpaidInvoices = collect();
        foreach (array_chunk($customerIds, 1000) as $chunk) {
            $unpaidInvoices = $unpaidInvoices->merge(
                DB::table('invoices')->whereNull('deleted_at')
                    ->whereIn('customer_id', $chunk)
                    ->whereIn('payment_status', ['unpaid', 'partial'])
                    ->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))
                    ->where('created_at', '<=', $dateToQuery)
                    ->orderBy('created_at')
                    ->get(['customer_id', 'total', 'paid_amount', 'created_at'])
            );
        }
        $unpaidByCustomer = $unpaidInvoices->groupBy('customer_id');

        return $customersQuery->map(function ($customer) use (
            $dateFromQuery, $dateToQuery, $dateToCarbon, $latestSnapshot, $rolloverDate, $showAllHistory,
            $newInvoicedSums, $newPaidSums, $newSettledSums, $newReturnedSums,
            $totalInvoicedSums, $totalPaidSums, $totalSettledSums, $totalReturnedSums,
            $futureInvoicedSums, $futurePaidSums, $futureSettledSums, $futureReturnedSums,
            $invoicesMovements, $paymentsMovements, $settlementsMovements, $returnsMovements, $unpaidByCustomer, $loadMovements, $movementsLimitPerCustomer
        ) {
            $cid = $customer->id;

            // 1. Calculate True Current Debt
            $dbOpeningBalance = (float) $customer->opening_balance;
            $newInvoiced = $newInvoicedSums[$cid] ?? 0.0;
            $newPaid = $newPaidSums[$cid] ?? 0.0;
            $newSettled = $newSettledSums[$cid] ?? 0.0;
            $newReturned = $newReturnedSums[$cid] ?? 0.0;

            $trueCurrentDebt = $dbOpeningBalance + ($newInvoiced + $newSettled) - ($newPaid + $newReturned);

            // 2. Sum operations in the Report's Date Range
            $totalInvoiced = $totalInvoicedSums[$cid] ?? 0.0;
            $totalPaid = $totalPaidSums[$cid] ?? 0.0;
            $totalSettled = $totalSettledSums[$cid] ?? 0.0;
            $totalReturned = $totalReturnedSums[$cid] ?? 0.0;

            // 3. Future Operations
            $futureInvoiced = $futureInvoicedSums[$cid] ?? 0.0;
            $futurePaid = $futurePaidSums[$cid] ?? 0.0;
            $futureSettled = $futureSettledSums[$cid] ?? 0.0;
            $futureReturned = $futureReturnedSums[$cid] ?? 0.0;

            $netFutureOperations = ($futureInvoiced + $futureSettled) - ($futurePaid + $futureReturned);
            $reportOpeningBalance = $trueCurrentDebt - $netFutureOperations;

            $totalDebt = $reportOpeningBalance + ($totalInvoiced + $totalSettled) - ($totalPaid + $totalReturned);

            // جمع كل الحركات
            $movements = collect();

            if ($loadMovements && round($reportOpeningBalance, 2) != 0) {
                $isRolloverBalance = false;
                $balanceDate = $dateFromQuery ?: ($customer->created_at ?: '2000-01-01 00:00:00');

                if ($latestSnapshot) {
                    if (!$showAllHistory || $dateFromQuery == $rolloverDate || $dateFromQuery == \Carbon\Carbon::parse($rolloverDate)->toDateString() . ' 00:00:00') {
                        $isRolloverBalance = true;
                        if (!$dateFromQuery) $balanceDate = $rolloverDate;
                    } elseif (!$dateFromQuery && $showAllHistory) {
                        $netNewOperations = ($newInvoiced + $newSettled) - ($newPaid + $newReturned);
                        if (round($netFutureOperations, 2) == round($netNewOperations, 2) && round($reportOpeningBalance, 2) == round($dbOpeningBalance, 2)) {
                            $isRolloverBalance = true;
                            $balanceDate = $rolloverDate;
                        }
                    }
                }

                $refText = $isRolloverBalance ? 'إقفال دورة ' . $latestSnapshot->name : 'رصيد سابق';

                $movements->push([
                    'type'     => 'opening_balance',
                    'ref'      => $refText,
                    'ref_id'   => null,
                    'amount'   => $reportOpeningBalance,
                    'date'     => $balanceDate,
                    'days_old' => null,
                ]);
            }

            if (isset($invoicesMovements[$cid])) {
                foreach ($invoicesMovements[$cid] as $r) {
                    $movements->push([
                        'type'     => 'invoice',
                        'ref'      => 'INV#' . $r->ref_id,
                        'ref_id'   => $r->ref_id,
                        'amount'   => (float)$r->amount,
                        'date'     => $r->created_at,
                        'days_old' => (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon),
                    ]);
                }
            }

            if (isset($paymentsMovements[$cid])) {
                foreach ($paymentsMovements[$cid] as $r) {
                    $movements->push([
                        'type'     => 'payment',
                        'ref'      => 'PAY#' . $r->ref_id,
                        'ref_id'   => $r->ref_id,
                        'amount'   => -(float)$r->amount,
                        'date'     => $r->created_at,
                        'days_old' => $r->created_at ? (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon) : null,
                    ]);
                }
            }

            if (isset($settlementsMovements[$cid])) {
                foreach ($settlementsMovements[$cid] as $r) {
                    $movements->push([
                        'type'     => 'settlement',
                        'ref'      => 'SET#' . $r->ref_id,
                        'ref_id'   => $r->ref_id,
                        'amount'   => +(float)$r->amount,
                        'date'     => $r->created_at,
                        'days_old' => $r->created_at ? (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon) : null,
                    ]);
                }
            }

            if (isset($returnsMovements[$cid])) {
                foreach ($returnsMovements[$cid] as $r) {
                    $movements->push([
                        'type'     => 'return',
                        'ref'      => 'RET#' . $r->ref_id,
                        'ref_id'   => $r->ref_id,
                        'amount'   => -(float)$r->amount,
                        'date'     => $r->created_at,
                        'days_old' => (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon),
                    ]);
                }
            }

            // ترتيب زمني + رصيد متحرك
            $sorted  = $movements->sortBy('date')->values();
            $balance = 0.0;
            $movementsList = $sorted->map(function ($m) use (&$balance) {
                $balance += $m['amount'];
                return array_merge($m, ['balance' => round($balance, 2)]);
            })->values()->toArray();

            // تصنيف عمر الدين
            $current = $days30_60 = $days60_90 = $over90 = 0.0;
            $remainingDebt = $totalDebt;

            if (isset($unpaidByCustomer[$cid])) {
                foreach ($unpaidByCustomer[$cid] as $inv) {
                    if ($remainingDebt <= 0) break;
                    $due  = min((float)$inv->total - (float)$inv->paid_amount, $remainingDebt);
                    if ($due <= 0) continue;
                    $days = (int) \Carbon\Carbon::parse($inv->created_at)->diffInDays($dateToCarbon);
                    if      ($days < 30) $current   += $due;
                    elseif  ($days < 60) $days30_60 += $due;
                    elseif  ($days < 90) $days60_90 += $due;
                    else                 $over90    += $due;
                    $remainingDebt -= $due;
                }
            }
            if ($remainingDebt > 0) $current += $remainingDebt;

            $totalMovementsCount = count($movementsList);
            $slicedMovements = $movementsLimitPerCustomer !== null ? array_slice($movementsList, 0, $movementsLimitPerCustomer) : $movementsList;

            return [
                'customer_id'     => $customer->id,
                'customer_name'   => $customer->name,
                'total_debt'      => round($totalDebt, 2),
                'total_invoiced'  => round($totalInvoiced, 2),
                'total_paid'      => round($totalPaid, 2),
                'total_settled'   => round($totalSettled, 2),
                'total_returned'  => round($totalReturned, 2),
                'current'         => round($current, 2),
                'days_30_60'      => round($days30_60, 2),
                'days_60_90'      => round($days60_90, 2),
                'over_90'         => round($over90, 2),
                'movements'       => $slicedMovements,
                'movements_count' => $totalMovementsCount,
            ];
        })->filter()->values()->toArray();
    }


    public function loadMoreCustomerMovements(
        int $customerId,
        int $offset = 30,
        int $limit = 30,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        bool $showAllHistory = false
    ): array {
        $full = $this->customerAging($customerId, $dateFrom, $dateTo, $showAllHistory, null);
        if (empty($full)) {
            return ['movements' => [], 'has_more' => false, 'next_offset' => $offset];
        }

        $allMovements = $full[0]['movements'] ?? [];
        $total = count($allMovements);
        $slice = array_slice($allMovements, $offset, $limit);
        $nextOffset = $offset + count($slice);
        $hasMore = $nextOffset < $total;

        return [
            'movements'   => $slice,
            'has_more'    => $hasMore,
            'next_offset' => $nextOffset,
        ];
    }


    public function exportCustomerAgingExcel(?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): void
    {
        $this->excelExporter->exportCustomerAgingExcel($this, $customerId, $dateFrom, $dateTo, $showAllHistory);
    }

    public function exportCustomerAgingPdf(?int $customerId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportCustomerAgingPdf($this, $customerId, $dateFrom, $dateTo, $showAllHistory);
    }

    public function supplierAging(?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false, ?int $movementsLimitPerSupplier = 30): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $latestSnapshot = DB::table('period_snapshots')
            ->join('accounting_periods', 'accounting_periods.id', '=', 'period_snapshots.period_id')
            ->orderBy('period_snapshots.id', 'desc')
            ->select('accounting_periods.name', 'accounting_periods.closed_at', 'period_snapshots.created_at')
            ->first();

        $rolloverDate = $latestSnapshot ? ($latestSnapshot->closed_at ?? $latestSnapshot->created_at) : null;

        $dateFromQuery = null;
        if ($dateFrom) {
            $dateFromQuery = $dateFrom . ' 00:00:00';
        } elseif (!$showAllHistory && $rolloverDate) {
            $dateFromQuery = $rolloverDate;
        }
        $dateToQuery   = $dateTo   ? $dateTo   . ' 23:59:59' : now()->toDateTimeString();
        $dateToCarbon  = \Carbon\Carbon::parse($dateToQuery);

        $suppliersQuery = DB::table('suppliers')
            ->when($supplierId, fn($q) => $q->where('id', $supplierId))
            ->orderBy('name')
            ->get(['id', 'name', 'opening_balance', 'created_at']);

        if ($suppliersQuery->isEmpty()) return [];

        $supplierIds = $suppliersQuery->pluck('id')->toArray();

        // Helper function to safely get chunks
        $getChunkedSums = function($table, $sumColumn, $dateCondition = null) use ($supplierIds) {
            $sums = [];
            foreach (array_chunk($supplierIds, 1000) as $chunk) {
                $query = DB::table($table)->whereNull('deleted_at')->whereIn('supplier_id', $chunk);
                if ($dateCondition) $dateCondition($query);
                $query->groupBy('supplier_id')->selectRaw("supplier_id, SUM($sumColumn) as sum_val");
                foreach ($query->pluck('sum_val', 'supplier_id') as $sid => $sum) {
                    $sums[$sid] = ($sums[$sid] ?? 0) + (float)$sum;
                }
            }
            return $sums;
        };

        // 1. True Current Debt (>= rolloverDate)
        $newPurchasedSums = $getChunkedSums('purchases', 'total', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);
        $newPaidSums = $getChunkedSums('supplier_payments', 'amount', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);
        $newSettledSums = $getChunkedSums('supplier_settlements', 'amount', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);
        $newReturnedSums = $getChunkedSums('purchase_returns', 'total', fn($q) => $rolloverDate ? $q->where('created_at', '>=', $rolloverDate) : null);

        // 2. Report Date Range
        $totalPurchasedSums = $getChunkedSums('purchases', 'total', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));
        $totalPaidSums = $getChunkedSums('supplier_payments', 'amount', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $totalSettledSums = $getChunkedSums('supplier_settlements', 'amount', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $totalReturnedSums = $getChunkedSums('purchase_returns', 'total', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));

        // 3. Future Operations (>= dateFromQuery)
        $futurePurchasedSums = $getChunkedSums('purchases', 'total', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);
        $futurePaidSums = $getChunkedSums('supplier_payments', 'amount', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);
        $futureSettledSums = $getChunkedSums('supplier_settlements', 'amount', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);
        $futureReturnedSums = $getChunkedSums('purchase_returns', 'total', fn($q) => $dateFromQuery ? $q->where('created_at', '>=', $dateFromQuery) : null);

        // Get movements
        $getChunkedMovements = function($table, $dateCondition) use ($supplierIds) {
            $items = collect();
            foreach (array_chunk($supplierIds, 1000) as $chunk) {
                $query = DB::table($table)->whereNull('deleted_at')->whereIn('supplier_id', $chunk);
                if ($dateCondition) $dateCondition($query);
                $query->select('id as ref_id', 'supplier_id', ($table == 'supplier_payments' || $table == 'supplier_settlements' ? 'amount' : 'total as amount'), 'created_at');
                $items = $items->merge($query->get());
            }
            return $items->groupBy('supplier_id');
        };

        $loadMovements = true;

        $purchasesMovements = $getChunkedMovements('purchases', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));
        $paymentsMovements = $getChunkedMovements('supplier_payments', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $settlementsMovements = $getChunkedMovements('supplier_settlements', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where(fn($q) => $q->whereNull('created_at')->orWhere('created_at', '<=', $dateToQuery)));
        $returnsMovements = $getChunkedMovements('purchase_returns', fn($q) => $q->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))->where('created_at', '<=', $dateToQuery));

        // Get Unpaid purchases for aging buckets
        $unpaidPurchases = collect();
        foreach (array_chunk($supplierIds, 1000) as $chunk) {
            $unpaidPurchases = $unpaidPurchases->merge(
                DB::table('purchases')->whereNull('deleted_at')
                    ->whereIn('supplier_id', $chunk)
                    ->whereIn('payment_status', ['unpaid', 'partial'])
                    ->when($dateFromQuery, fn($q) => $q->where('created_at', '>=', $dateFromQuery))
                    ->where('created_at', '<=', $dateToQuery)
                    ->orderBy('created_at')
                    ->get(['supplier_id', 'total', 'paid_amount', 'created_at'])
            );
        }
        $unpaidBySupplier = $unpaidPurchases->groupBy('supplier_id');

        return $suppliersQuery->map(function ($supplier) use (
            $dateFromQuery, $dateToQuery, $dateToCarbon, $latestSnapshot, $rolloverDate, $showAllHistory,
            $newPurchasedSums, $newPaidSums, $newSettledSums, $newReturnedSums,
            $totalPurchasedSums, $totalPaidSums, $totalSettledSums, $totalReturnedSums,
            $futurePurchasedSums, $futurePaidSums, $futureSettledSums, $futureReturnedSums,
            $purchasesMovements, $paymentsMovements, $settlementsMovements, $returnsMovements, $unpaidBySupplier, $loadMovements, $movementsLimitPerSupplier
        ) {
            $sid = $supplier->id;

            // 1. Calculate True Current Debt
            $dbOpeningBalance = (float) $supplier->opening_balance;
            $newPurchased = $newPurchasedSums[$sid] ?? 0.0;
            $newPaid = $newPaidSums[$sid] ?? 0.0;
            $newSettled = $newSettledSums[$sid] ?? 0.0;
            $newReturned = $newReturnedSums[$sid] ?? 0.0;

            $trueCurrentDebt = $dbOpeningBalance + ($newPurchased + $newSettled) - ($newPaid + $newReturned);

            // 2. Sum operations in the Report's Date Range
            $totalPurchased = $totalPurchasedSums[$sid] ?? 0.0;
            $totalPaid = $totalPaidSums[$sid] ?? 0.0;
            $totalSettled = $totalSettledSums[$sid] ?? 0.0;
            $totalReturned = $totalReturnedSums[$sid] ?? 0.0;

            // 3. Future Operations
            $futurePurchased = $futurePurchasedSums[$sid] ?? 0.0;
            $futurePaid = $futurePaidSums[$sid] ?? 0.0;
            $futureSettled = $futureSettledSums[$sid] ?? 0.0;
            $futureReturned = $futureReturnedSums[$sid] ?? 0.0;

            $netFutureOperations = ($futurePurchased + $futureSettled) - ($futurePaid + $futureReturned);
            $reportOpeningBalance = $trueCurrentDebt - $netFutureOperations;

            $totalDebt = $reportOpeningBalance + ($totalPurchased + $totalSettled) - ($totalPaid + $totalReturned);

            $movements = collect();

            if ($loadMovements && round($reportOpeningBalance, 2) != 0) {
                $isRolloverBalance = false;
                $balanceDate = $dateFromQuery ?: ($supplier->created_at ?: '2000-01-01 00:00:00');

                if ($latestSnapshot) {
                    if (!$showAllHistory || $dateFromQuery == $rolloverDate || $dateFromQuery == \Carbon\Carbon::parse($rolloverDate)->toDateString() . ' 00:00:00') {
                        $isRolloverBalance = true;
                        if (!$dateFromQuery) $balanceDate = $rolloverDate;
                    } elseif (!$dateFromQuery && $showAllHistory) {
                        $netNewOperations = ($newPurchased + $newSettled) - ($newPaid + $newReturned);
                        if (round($netFutureOperations, 2) == round($netNewOperations, 2) && round($reportOpeningBalance, 2) == round($dbOpeningBalance, 2)) {
                            $isRolloverBalance = true;
                            $balanceDate = $rolloverDate;
                        }
                    }
                }

                $refText = $isRolloverBalance ? 'إقفال دورة ' . $latestSnapshot->name : 'رصيد سابق';

                $movements->push([
                    'type'   => 'opening_balance',
                    'ref'    => $refText,
                    'ref_id' => null,
                    'amount' => $reportOpeningBalance,
                    'date'   => $balanceDate,
                    'days_old' => null,
                ]);
            }

            if (isset($purchasesMovements[$sid])) {
                foreach ($purchasesMovements[$sid] as $r) {
                    $movements->push([
                        'type'   => 'purchase',
                        'ref'    => 'PUR#' . $r->ref_id,
                        'ref_id' => $r->ref_id,
                        'amount' => (float)$r->amount,
                        'date'   => $r->created_at,
                        'days_old' => (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon),
                    ]);
                }
            }

            if (isset($paymentsMovements[$sid])) {
                foreach ($paymentsMovements[$sid] as $r) {
                    $movements->push([
                        'type'   => 'payment',
                        'ref'    => 'PAY#' . $r->ref_id,
                        'ref_id' => $r->ref_id,
                        'amount' => -(float)$r->amount,
                        'date'   => $r->created_at,
                        'days_old' => $r->created_at ? (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon) : null,
                    ]);
                }
            }

            if (isset($settlementsMovements[$sid])) {
                foreach ($settlementsMovements[$sid] as $r) {
                    $movements->push([
                        'type'   => 'settlement',
                        'ref'    => 'SET#' . $r->ref_id,
                        'ref_id' => $r->ref_id,
                        'amount' => +(float)$r->amount,
                        'date'   => $r->created_at,
                        'days_old' => $r->created_at ? (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon) : null,
                    ]);
                }
            }

            if (isset($returnsMovements[$sid])) {
                foreach ($returnsMovements[$sid] as $r) {
                    $movements->push([
                        'type'   => 'return',
                        'ref'    => 'RET#' . $r->ref_id,
                        'ref_id' => $r->ref_id,
                        'amount' => -(float)$r->amount,
                        'date'   => $r->created_at,
                        'days_old' => (int) \Carbon\Carbon::parse($r->created_at)->diffInDays($dateToCarbon),
                    ]);
                }
            }

            $sorted  = $movements->sortBy('date')->values();
            $balance = 0.0;
            $movementsList = $sorted->map(function ($m) use (&$balance) {
                $balance += $m['amount'];
                return array_merge($m, ['balance' => round($balance, 2)]);
            })->values()->toArray();

            $current = $days30_60 = $days60_90 = $over90 = 0.0;
            $remainingDebt = $totalDebt;
            
            if (isset($unpaidBySupplier[$sid])) {
                foreach ($unpaidBySupplier[$sid] as $p) {
                    if ($remainingDebt <= 0) break;
                    $due  = min((float)$p->total - (float)$p->paid_amount, $remainingDebt);
                    if ($due <= 0) continue;
                    $days = (int) \Carbon\Carbon::parse($p->created_at)->diffInDays($dateToCarbon);
                    if      ($days < 30) $current   += $due;
                    elseif  ($days < 60) $days30_60 += $due;
                    elseif  ($days < 90) $days60_90 += $due;
                    else                 $over90    += $due;
                    $remainingDebt -= $due;
                }
            }
            if ($remainingDebt > 0) $current += $remainingDebt;

            $totalMovementsCount = count($movementsList);
            $slicedMovements = $movementsLimitPerSupplier !== null ? array_slice($movementsList, 0, $movementsLimitPerSupplier) : $movementsList;

            return [
                'supplier_id'     => $supplier->id,
                'supplier_name'   => $supplier->name,
                'total_debt'      => round($totalDebt, 2),
                'total_purchased' => round($totalPurchased, 2),
                'total_paid'      => round($totalPaid, 2),
                'total_settled'   => round($totalSettled, 2),
                'total_returned'  => round($totalReturned, 2),
                'current'         => round($current, 2),
                'days_30_60'      => round($days30_60, 2),
                'days_60_90'      => round($days60_90, 2),
                'over_90'         => round($over90, 2),
                'movements'       => $slicedMovements,
                'movements_count' => $totalMovementsCount,
            ];
        })->filter()->values()->toArray();
    }


    public function loadMoreSupplierMovements(
        int $supplierId,
        int $offset = 30,
        int $limit = 30,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        bool $showAllHistory = false
    ): array {
        $full = $this->supplierAging($supplierId, $dateFrom, $dateTo, $showAllHistory, null);
        if (empty($full)) {
            return ['movements' => [], 'has_more' => false, 'next_offset' => $offset];
        }

        $allMovements = $full[0]['movements'] ?? [];
        $total = count($allMovements);
        $slice = array_slice($allMovements, $offset, $limit);
        $nextOffset = $offset + count($slice);
        $hasMore = $nextOffset < $total;

        return [
            'movements'   => $slice,
            'has_more'    => $hasMore,
            'next_offset' => $nextOffset,
        ];
    }


    public function exportSupplierAgingExcel(?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): void
    {
        $this->excelExporter->exportSupplierAgingExcel($this, $supplierId, $dateFrom, $dateTo, $showAllHistory);
    }

    public function exportSupplierAgingPdf(?int $supplierId, ?string $dateFrom, ?string $dateTo, bool $showAllHistory = false): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportSupplierAgingPdf($this, $supplierId, $dateFrom, $dateTo, $showAllHistory);
    }

    public function getIncludedProducts(?array $filterProductIds, ?string $searchName): array
    {
        if (empty($filterProductIds) && empty($searchName)) {
            return [];
        }

        return DB::table('products')->where(function($sub) use ($filterProductIds, $searchName) {
            if (!empty($filterProductIds)) {
                $sub->whereIn('id', $filterProductIds);
            }
            if ($searchName) {
                foreach (explode(',', $searchName) as $term) {
                    $term = trim($term);
                    if ($term !== '') {
                        $sub->orWhere('name', 'like', '%' . $term . '%');
                    }
                }
            }
        })->get(['id', 'name'])->toArray();
    }

    // ─── Sales ─────────────────────────────────────────────────────────────────


    private function salesQuery(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null)
    {
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        $query = DB::table('invoices')
            ->whereNull('invoices.deleted_at')
            ->when($df,              fn($q) => $q->where('invoices.created_at', '>=', $df))
            ->when($dt,              fn($q) => $q->where('invoices.created_at', '<=', $dt))
            ->when($userId,          fn($q) => $q->where('invoices.user_id', $userId))
            ->when($customerId,      fn($q) => $q->where('invoices.customer_id', $customerId));

        if ($paymentMethodId) {
            $query->whereExists(fn($q) => $q->from('payments')
                ->whereColumn('payments.invoice_id', 'invoices.id')
                ->whereNull('payments.deleted_at')
                ->where('payments.payment_method_id', $paymentMethodId));
        }

        if ($categoryId) {
            $query->whereExists(fn($q) => $q->from('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->whereColumn('invoice_items.invoice_id', 'invoices.id')
                ->where('products.category_id', $categoryId));
        }

        if (!empty($filterProductIds) || !empty($searchName)) {
            $query->whereExists(fn($q) => $q->from('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->whereColumn('invoice_items.invoice_id', 'invoices.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        return $query;
    }


    public function sales(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, bool $compare = false, ?array $filterProductIds = null, ?string $searchName = null): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        $base = $this->salesQuery($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);

        $totalSales     = (float) (clone $base)->sum('invoices.total');
        $invoicesCount  = (int)   (clone $base)->count();
        $totalPaid      = (float) (clone $base)->sum('invoices.paid_amount');
        $totalDue       = (float) (clone $base)->sum('invoices.due_amount');
        $avgInvoice     = $invoicesCount > 0 ? round($totalSales / $invoicesCount, 2) : 0;

        // تفصيل يومي مجمّع بالشهر
        $dailyRows = (clone $base)
            ->select(DB::raw('DATE(invoices.created_at) as date'), DB::raw('SUM(invoices.total) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw('DATE(invoices.created_at)'))
            ->orderBy('date')
            ->get();

        // تجميع الأيام تحت شهورها
        $monthly = [];
        foreach ($dailyRows as $row) {
            $month = substr($row->date, 0, 7); // 2026-05
            if (!isset($monthly[$month])) {
                $monthly[$month] = ['month' => $month, 'total' => 0, 'count' => 0, 'days' => []];
            }
            $monthly[$month]['total'] += (float)$row->total;
            $monthly[$month]['count'] += (int)$row->count;
            $monthly[$month]['days'][] = ['date' => $row->date, 'total' => (float)$row->total, 'count' => (int)$row->count];
        }
        $monthly = array_values($monthly);
        $daily   = $dailyRows->map(fn($r) => ['date' => $r->date, 'total' => (float)$r->total, 'count' => (int)$r->count])->toArray();

        // مقارنة مع الفترة السابقة
        $comparison = null;
        if ($compare && $df && $dt) {
            $diffDays  = \Carbon\Carbon::parse($df)->diffInDays(\Carbon\Carbon::parse($dt)) + 1;
            $prevDf    = \Carbon\Carbon::parse($df)->subDays($diffDays)->toDateTimeString();
            $prevDt    = \Carbon\Carbon::parse($df)->subSecond()->toDateTimeString();
            $prevBase  = $this->salesQuery(
                substr($prevDf, 0, 10), substr($prevDt, 0, 10),
                $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName
            );
            $prevTotal = (float) (clone $prevBase)->sum('invoices.total');
            $prevCount = (int)   (clone $prevBase)->count();
            $comparison = [
                'total_sales'    => $prevTotal,
                'invoices_count' => $prevCount,
                'diff_pct'       => $prevTotal > 0 ? round((($totalSales - $prevTotal) / $prevTotal) * 100, 1) : null,
            ];
        }

        $includedProducts = [];
        if (!empty($filterProductIds) || !empty($searchName)) {
            $includedProducts = DB::table('products')->where(function($sub) use ($filterProductIds, $searchName) {
                if (!empty($filterProductIds)) $sub->whereIn('id', $filterProductIds);
                if ($searchName) {
                    foreach (explode(',', $searchName) as $term) {
                        $term = trim($term);
                        if ($term !== '') $sub->orWhere('name', 'like', '%' . $term . '%');
                    }
                }
            })->get(['id', 'name'])->toArray();
        }

        // تفصيل المدفوعات حسب وسيلة الدفع للفواتير المفلترة
        $paymentMethodsBreakdown = $this->getSalesPaymentMethodsBreakdown($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName, $totalPaid);

        return compact('totalSales', 'invoicesCount', 'avgInvoice', 'totalPaid', 'totalDue', 'daily', 'monthly', 'comparison', 'includedProducts', 'paymentMethodsBreakdown');
    }


    public function getSalesPaymentMethodsBreakdown(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?float $totalPaid = null): array
    {
        $base = $this->salesQuery($dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);

        if ($totalPaid === null) {
            $totalPaid = (float) (clone $base)->sum('invoices.paid_amount');
        }

        return DB::table('payments')
            ->join('payment_methods', 'payment_methods.id', '=', 'payments.payment_method_id')
            ->joinSub((clone $base)->select('invoices.id as filtered_invoice_id'), 'filtered_invoices', function ($join) {
                $join->on('filtered_invoices.filtered_invoice_id', '=', 'payments.invoice_id');
            })
            ->whereNull('payments.deleted_at')
            ->groupBy('payment_methods.id', 'payment_methods.name')
            ->select(
                'payment_methods.id',
                'payment_methods.name',
                DB::raw('SUM(payments.amount) as total_amount'),
                DB::raw('COUNT(payments.id) as count')
            )
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn($row) => [
                'id'           => (int) $row->id,
                'name'         => $row->name,
                'total_amount' => (float) $row->total_amount,
                'count'        => (int) $row->count,
                'percentage'   => $totalPaid > 0 ? round(((float)$row->total_amount / $totalPaid) * 100, 1) : 0,
            ])
            ->toArray();
    }


    public function exportSalesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        $this->excelExporter->exportSalesExcel($this, $dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);
    }

    public function exportSalesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportSalesPdf($this, $dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);
    }

    public function salesCustomerInvoices(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $invoicesLimitPerCustomer = 30): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        // 1. Fetch Invoices First
        $invoicesQuery = DB::table('invoices')
            ->whereNull('invoices.deleted_at')
            ->when($customerId, fn($q) => $q->where('invoices.customer_id', $customerId))
            ->when($df,     fn($q) => $q->where('invoices.created_at', '>=', $df))
            ->when($dt,     fn($q) => $q->where('invoices.created_at', '<=', $dt))
            ->when($userId, fn($q) => $q->where('invoices.user_id', $userId));

        if ($paymentMethodId) {
            $invoicesQuery->whereExists(fn($q) => $q->from('payments')
                ->whereColumn('payments.invoice_id', 'invoices.id')
                ->whereNull('payments.deleted_at')
                ->where('payments.payment_method_id', $paymentMethodId));
        }

        if ($categoryId) {
            $invoicesQuery->whereExists(fn($q) => $q->from('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->whereColumn('invoice_items.invoice_id', 'invoices.id')
                ->where('products.category_id', $categoryId));
        }

        if (!empty($filterProductIds) || !empty($searchName)) {
            $invoicesQuery->whereExists(fn($q) => $q->from('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->whereColumn('invoice_items.invoice_id', 'invoices.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        $invoices = $invoicesQuery
            ->join('customers', 'customers.id', '=', 'invoices.customer_id')
            ->select('invoices.id', 'invoices.invoice_number', 'invoices.total', 'invoices.paid_amount', 'invoices.due_amount', 'invoices.created_at', 'customers.id as customer_id', 'customers.name as customer_name')
            ->orderBy('invoices.created_at')
            ->get();

        if ($invoices->isEmpty()) return [];

        $invoiceIds = $invoices->pluck('id')->toArray();
        $invoiceIdChunks = array_chunk($invoiceIds, 5000);

        // 2. Fetch ALL matching items for these invoices in chunked queries
        $itemsQuery = collect();
        foreach ($invoiceIdChunks as $chunk) {
            $chunkItems = DB::table('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->leftJoin('sizes', 'sizes.id', '=', 'invoice_items.size_id')
                ->whereIn('invoice_items.invoice_id', $chunk)
                ->when($categoryId, fn($q) => $q->where('products.category_id', $categoryId))
                ->select(
                    'invoice_items.invoice_id',
                    'products.id as product_id',
                    'products.name as product_name',
                    'invoice_items.unit_price',
                    'invoice_items.sale_type',
                    'sizes.value as size_value',
                    DB::raw('SUM(invoice_items.quantity) as total_quantity'),
                    DB::raw('SUM(invoice_items.line_total) as line_total')
                )
                ->groupBy(
                    'invoice_items.invoice_id',
                    'products.id',
                    'products.name',
                    'invoice_items.unit_price',
                    'invoice_items.sale_type',
                    'sizes.value'
                )
                ->get();
            
            $itemsQuery = $itemsQuery->merge($chunkItems);
        }

        $itemsByInvoice = [];
        foreach ($itemsQuery as $item) {
            $isMatched = false;
            if (!empty($filterProductIds) || !empty($searchName)) {
                if (!empty($filterProductIds) && in_array($item->product_id, $filterProductIds)) {
                    $isMatched = true;
                } elseif (!empty($searchName)) {
                    $terms = explode(',', $searchName);
                    foreach ($terms as $term) {
                        if (trim($term) !== '' && mb_stripos($item->product_name, trim($term)) !== false) {
                            $isMatched = true;
                            break;
                        }
                    }
                }
            }
            $item->is_matched = $isMatched;

            if ($item->sale_type !== 'unit_based' && !empty($item->size_value) && (float)$item->size_value > 0) {
                $singleSize = (float)$item->size_value;
                $calculatedCount = (int)round($item->total_quantity / $singleSize);
                $calculatedQty = $singleSize;
            } else {
                if ($item->sale_type === 'unit_based') {
                    $calculatedCount = (float)$item->total_quantity;
                    $calculatedQty = 1.0;
                } else {
                    $calculatedCount = 1;
                    $calculatedQty = (float)$item->total_quantity;
                }
            }

            $item->count = $calculatedCount;
            $item->quantity = $calculatedQty;
            
            $itemsByInvoice[$item->invoice_id][] = (array)$item;
        }

        $customersData = [];
        foreach ($invoices as $inv) {
            $cid = $inv->customer_id;
            if (!isset($customersData[$cid])) {
                $customersData[$cid] = [
                    'customer_id'   => $cid,
                    'customer_name' => $inv->customer_name,
                    'invoice_count' => 0,
                    'total_amount'  => 0,
                    'total_paid'    => 0,
                    'total_due'     => 0,
                    'invoices'      => []
                ];
            }
            
            $invItems = $itemsByInvoice[$inv->id] ?? [];
            if (empty($invItems) && $categoryId) {
                // If category filter was applied, and this invoice has NO items for that category, skip adding to result
                continue;
            }

            $customersData[$cid]['invoice_count']++;
            $customersData[$cid]['total_amount'] += (float)$inv->total;
            $customersData[$cid]['total_paid'] += (float)$inv->paid_amount;
            $customersData[$cid]['total_due'] += (float)$inv->due_amount;

            if ($invoicesLimitPerCustomer === null || count($customersData[$cid]['invoices']) < $invoicesLimitPerCustomer) {
                $customersData[$cid]['invoices'][] = [
                    'id'             => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'total'          => (float) $inv->total,
                    'paid_amount'    => (float) $inv->paid_amount,
                    'due_amount'     => (float) $inv->due_amount,
                    'date'           => $inv->created_at,
                    'items'          => $invItems,
                ];
            }
        }

        $result = array_values($customersData);
        usort($result, fn($a, $b) => $b['total_amount'] <=> $a['total_amount']);

        return $result;
    }


    public function loadMoreCustomerInvoices(
        int $customerId,
        int $offset = 30,
        int $limit = 30,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?int $userId = null,
        ?int $paymentMethodId = null,
        ?int $categoryId = null,
        ?array $filterProductIds = null,
        ?string $searchName = null
    ): array {
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        $invoicesQuery = DB::table('invoices')
            ->whereNull('invoices.deleted_at')
            ->where('invoices.customer_id', $customerId)
            ->when($df,     fn($q) => $q->where('invoices.created_at', '>=', $df))
            ->when($dt,     fn($q) => $q->where('invoices.created_at', '<=', $dt))
            ->when($userId, fn($q) => $q->where('invoices.user_id', $userId));

        if ($paymentMethodId) {
            $invoicesQuery->whereExists(fn($q) => $q->from('payments')
                ->whereColumn('payments.invoice_id', 'invoices.id')
                ->whereNull('payments.deleted_at')
                ->where('payments.payment_method_id', $paymentMethodId));
        }

        if ($categoryId) {
            $invoicesQuery->whereExists(fn($q) => $q->from('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->whereColumn('invoice_items.invoice_id', 'invoices.id')
                ->where('products.category_id', $categoryId));
        }

        if (!empty($filterProductIds) || !empty($searchName)) {
            $invoicesQuery->whereExists(fn($q) => $q->from('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->whereColumn('invoice_items.invoice_id', 'invoices.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        $totalInvoices = (clone $invoicesQuery)->count();

        $invoices = (clone $invoicesQuery)
            ->select('invoices.id', 'invoices.total', 'invoices.paid_amount', 'invoices.due_amount', 'invoices.created_at')
            ->orderBy('invoices.created_at')
            ->skip($offset)
            ->take($limit)
            ->get();

        if ($invoices->isEmpty()) {
            return [
                'invoices'    => [],
                'has_more'    => false,
                'next_offset' => $offset,
            ];
        }

        $invoiceIds = $invoices->pluck('id')->toArray();

        $itemsQuery = DB::table('invoice_items')
            ->join('products', 'products.id', '=', 'invoice_items.product_id')
            ->leftJoin('sizes', 'sizes.id', '=', 'invoice_items.size_id')
            ->whereIn('invoice_items.invoice_id', $invoiceIds)
            ->when($categoryId, fn($q) => $q->where('products.category_id', $categoryId))
            ->select(
                'invoice_items.invoice_id',
                'products.id as product_id',
                'products.name as product_name',
                'invoice_items.unit_price',
                'invoice_items.sale_type',
                'sizes.value as size_value',
                DB::raw('SUM(invoice_items.quantity) as total_quantity'),
                DB::raw('SUM(invoice_items.line_total) as line_total')
            )
            ->groupBy(
                'invoice_items.invoice_id',
                'products.id',
                'products.name',
                'invoice_items.unit_price',
                'invoice_items.sale_type',
                'sizes.value'
            )
            ->get();

        $itemsByInvoice = [];
        foreach ($itemsQuery as $item) {
            $isMatched = false;
            if (!empty($filterProductIds) || !empty($searchName)) {
                if (!empty($filterProductIds) && in_array($item->product_id, $filterProductIds)) {
                    $isMatched = true;
                } elseif (!empty($searchName)) {
                    $terms = explode(',', $searchName);
                    foreach ($terms as $term) {
                        if (trim($term) !== '' && mb_stripos($item->product_name, trim($term)) !== false) {
                            $isMatched = true;
                            break;
                        }
                    }
                }
            }
            $item->is_matched = $isMatched;

            if ($item->sale_type !== 'unit_based' && !empty($item->size_value) && (float)$item->size_value > 0) {
                $singleSize = (float)$item->size_value;
                $calculatedCount = (int)round($item->total_quantity / $singleSize);
                $calculatedQty = $singleSize;
            } else {
                if ($item->sale_type === 'unit_based') {
                    $calculatedCount = (float)$item->total_quantity;
                    $calculatedQty = 1.0;
                } else {
                    $calculatedCount = 1;
                    $calculatedQty = (float)$item->total_quantity;
                }
            }

            $item->count = $calculatedCount;
            $item->quantity = $calculatedQty;

            $itemsByInvoice[$item->invoice_id][] = (array)$item;
        }

        $resultInvoices = [];
        foreach ($invoices as $inv) {
            $resultInvoices[] = [
                'id'          => $inv->id,
                'total'       => (float) $inv->total,
                'paid_amount' => (float) $inv->paid_amount,
                'due_amount'  => (float) $inv->due_amount,
                'date'        => $inv->created_at,
                'items'       => $itemsByInvoice[$inv->id] ?? [],
            ];
        }

        $nextOffset = $offset + count($resultInvoices);
        $hasMore = $nextOffset < $totalInvoices;

        return [
            'invoices'    => $resultInvoices,
            'has_more'    => $hasMore,
            'next_offset' => $nextOffset,
        ];
    }


    public function exportSalesCustomerInvoicesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        $this->excelExporter->exportSalesCustomerInvoicesExcel($this, $dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);
    }

    public function exportSalesCustomerInvoicesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $limit = 500, ?int $offset = 0): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportSalesCustomerInvoicesPdf($this, $dateFrom, $dateTo, $userId, $customerId, $paymentMethodId, $categoryId, $filterProductIds, $searchName, $limit, $offset);
    }

    private function purchasesQuery(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $paymentMethodId = null, ?int $categoryId = null, ?array $filterProductIds = null, ?string $searchName = null)
    {
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        $query = DB::table('purchases')
            ->whereNull('purchases.deleted_at')
            ->when($df,         fn($q) => $q->where('purchases.created_at', '>=', $df))
            ->when($dt,         fn($q) => $q->where('purchases.created_at', '<=', $dt))
            ->when($userId,     fn($q) => $q->where('purchases.user_id', $userId))
            ->when($supplierId, fn($q) => $q->where('purchases.supplier_id', $supplierId));

        if ($paymentMethodId) {
            $query->whereExists(fn($q) => $q->from('supplier_payments')
                ->whereColumn('supplier_payments.purchase_id', 'purchases.id')
                ->where('supplier_payments.payment_method_id', $paymentMethodId)
                ->whereNull('supplier_payments.deleted_at'));
        }

        if ($categoryId) {
            $query->whereExists(fn($q) => $q->from('purchase_items')
                ->join('products', 'products.id', '=', 'purchase_items.product_id')
                ->whereColumn('purchase_items.purchase_id', 'purchases.id')
                ->where('products.category_id', $categoryId));
        }

        if (!empty($filterProductIds) || !empty($searchName)) {
            $query->whereExists(fn($q) => $q->from('purchase_items')
                ->join('products', 'products.id', '=', 'purchase_items.product_id')
                ->whereColumn('purchase_items.purchase_id', 'purchases.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        return $query;
    }


    public function purchases(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $paymentMethodId = null, ?int $categoryId = null, bool $compare = false, ?array $filterProductIds = null, ?string $searchName = null): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        $base = $this->purchasesQuery($dateFrom, $dateTo, $userId, $supplierId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);

        $totalPurchases  = (float) (clone $base)->sum('purchases.total');
        $purchasesCount  = (int)   (clone $base)->count();
        $totalPaid       = (float) (clone $base)->sum('purchases.paid_amount');
        $totalDue        = (float) (clone $base)->sum('purchases.due_amount');
        $avgPurchase     = $purchasesCount > 0 ? round($totalPurchases / $purchasesCount, 2) : 0;

        $dailyRows = (clone $base)
            ->select(DB::raw('DATE(purchases.created_at) as date'), DB::raw('SUM(purchases.total) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw('DATE(purchases.created_at)'))
            ->orderBy('date')
            ->get();

        $monthly = [];
        foreach ($dailyRows as $row) {
            $month = substr($row->date, 0, 7);
            if (!isset($monthly[$month])) {
                $monthly[$month] = ['month' => $month, 'total' => 0, 'count' => 0, 'days' => []];
            }
            $monthly[$month]['total'] += (float)$row->total;
            $monthly[$month]['count'] += (int)$row->count;
            $monthly[$month]['days'][] = ['date' => $row->date, 'total' => (float)$row->total, 'count' => (int)$row->count];
        }
        $monthly = array_values($monthly);

        $comparison = null;
        if ($compare && $df && $dt) {
            $diffDays = \Carbon\Carbon::parse($df)->diffInDays(\Carbon\Carbon::parse($dt)) + 1;
            $prevDf   = \Carbon\Carbon::parse($df)->subDays($diffDays)->toDateTimeString();
            $prevDt   = \Carbon\Carbon::parse($df)->subSecond()->toDateTimeString();
            $prevBase = $this->purchasesQuery(substr($prevDf, 0, 10), substr($prevDt, 0, 10), $userId, $supplierId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);
            $prevTotal = (float) (clone $prevBase)->sum('purchases.total');
            $prevCount = (int)   (clone $prevBase)->count();
            $comparison = [
                'total_purchases'  => $prevTotal,
                'purchases_count'  => $prevCount,
                'diff_pct'         => $prevTotal > 0 ? round((($totalPurchases - $prevTotal) / $prevTotal) * 100, 1) : null,
            ];
        }

        $includedProducts = [];
        if (!empty($filterProductIds) || !empty($searchName)) {
            $includedProducts = DB::table('products')->where(function($sub) use ($filterProductIds, $searchName) {
                if (!empty($filterProductIds)) $sub->whereIn('id', $filterProductIds);
                if ($searchName) {
                    foreach (explode(',', $searchName) as $term) {
                        $term = trim($term);
                        if ($term !== '') $sub->orWhere('name', 'like', '%' . $term . '%');
                    }
                }
            })->get(['id', 'name'])->toArray();
        }

        // تفصيل المدفوعات للموردين حسب وسيلة الدفع للفواتير المفلترة
        $paymentMethodsBreakdown = $this->getPurchasesPaymentMethodsBreakdown($dateFrom, $dateTo, $userId, $supplierId, $paymentMethodId, $categoryId, $filterProductIds, $searchName, $totalPaid);

        return compact('totalPurchases', 'purchasesCount', 'avgPurchase', 'totalPaid', 'totalDue', 'monthly', 'comparison', 'includedProducts', 'paymentMethodsBreakdown');
    }


    public function getPurchasesPaymentMethodsBreakdown(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $paymentMethodId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?float $totalPaid = null): array
    {
        $base = $this->purchasesQuery($dateFrom, $dateTo, $userId, $supplierId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);

        if ($totalPaid === null) {
            $totalPaid = (float) (clone $base)->sum('purchases.paid_amount');
        }

        return DB::table('supplier_payments')
            ->join('payment_methods', 'payment_methods.id', '=', 'supplier_payments.payment_method_id')
            ->joinSub((clone $base)->select('purchases.id as filtered_purchase_id'), 'filtered_purchases', function ($join) {
                $join->on('filtered_purchases.filtered_purchase_id', '=', 'supplier_payments.purchase_id');
            })
            ->whereNull('supplier_payments.deleted_at')
            ->groupBy('payment_methods.id', 'payment_methods.name')
            ->select(
                'payment_methods.id',
                'payment_methods.name',
                DB::raw('SUM(supplier_payments.amount) as total_amount'),
                DB::raw('COUNT(supplier_payments.id) as count')
            )
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn($row) => [
                'id'           => (int) $row->id,
                'name'         => $row->name,
                'total_amount' => (float) $row->total_amount,
                'count'        => (int) $row->count,
                'percentage'   => $totalPaid > 0 ? round(((float)$row->total_amount / $totalPaid) * 100, 1) : 0,
            ])
            ->toArray();
    }


    public function exportPurchasesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $paymentMethodId = null, ?int $categoryId = null, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        $this->excelExporter->exportPurchasesExcel($this, $dateFrom, $dateTo, $userId, $supplierId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);
    }

    public function exportPurchasesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $paymentMethodId = null, ?int $categoryId = null, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportPurchasesPdf($this, $dateFrom, $dateTo, $userId, $supplierId, $paymentMethodId, $categoryId, $filterProductIds, $searchName);
    }

    public function purchasesSupplierInvoices(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $invoicesLimitPerSupplier = 30): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        // 1. Fetch Purchases First
        $purchasesQuery = DB::table('purchases')
            ->whereNull('purchases.deleted_at')
            ->when($supplierId, fn($q) => $q->where('purchases.supplier_id', $supplierId))
            ->when($df,     fn($q) => $q->where('purchases.created_at', '>=', $df))
            ->when($dt,     fn($q) => $q->where('purchases.created_at', '<=', $dt))
            ->when($userId, fn($q) => $q->where('purchases.user_id', $userId));

        if ($categoryId) {
            $purchasesQuery->whereExists(fn($q) => $q->from('purchase_items')
                ->join('products', 'products.id', '=', 'purchase_items.product_id')
                ->whereColumn('purchase_items.purchase_id', 'purchases.id')
                ->where('products.category_id', $categoryId));
        }

        if (!empty($filterProductIds) || !empty($searchName)) {
            $purchasesQuery->whereExists(fn($q) => $q->from('purchase_items')
                ->join('products', 'products.id', '=', 'purchase_items.product_id')
                ->whereColumn('purchase_items.purchase_id', 'purchases.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        $purchases = $purchasesQuery
            ->join('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->select('purchases.id', 'purchases.total', 'purchases.created_at', 'suppliers.id as supplier_id', 'suppliers.name as supplier_name')
            ->orderBy('purchases.created_at')
            ->get();

        if ($purchases->isEmpty()) return [];

        $purchaseIds = $purchases->pluck('id')->toArray();
        $purchaseIdChunks = array_chunk($purchaseIds, 5000);

        // 2. Fetch ALL matching items for these purchases in chunked queries
        $itemsQuery = collect();
        foreach ($purchaseIdChunks as $chunk) {
            $chunkItems = DB::table('purchase_items')
                ->join('products', 'products.id', '=', 'purchase_items.product_id')
                ->whereIn('purchase_items.purchase_id', $chunk)
                ->when($categoryId, fn($q) => $q->where('products.category_id', $categoryId))
                ->select(
                    'purchase_items.purchase_id',
                    'products.id as product_id',
                    'products.name as product_name',
                    'purchase_items.unit_cost',
                    DB::raw('MIN(purchase_items.quantity) as quantity'),
                    DB::raw('COUNT(*) as count')
                )
                ->groupBy('purchase_items.purchase_id', 'products.id', 'products.name', 'purchase_items.unit_cost')
                ->get();
                
            $itemsQuery = $itemsQuery->merge($chunkItems);
        }

        $itemsByPurchase = [];
        foreach ($itemsQuery as $item) {
            $isMatched = false;
            if (!empty($filterProductIds) || !empty($searchName)) {
                if (!empty($filterProductIds) && in_array($item->product_id, $filterProductIds)) {
                    $isMatched = true;
                } elseif (!empty($searchName)) {
                    $terms = explode(',', $searchName);
                    foreach ($terms as $term) {
                        if (trim($term) !== '' && mb_stripos($item->product_name, trim($term)) !== false) {
                            $isMatched = true;
                            break;
                        }
                    }
                }
            }
            $item->is_matched = $isMatched;
            
            $itemsByPurchase[$item->purchase_id][] = (array)$item;
        }

        $suppliersData = [];
        foreach ($purchases as $p) {
            $sid = $p->supplier_id;
            if (!isset($suppliersData[$sid])) {
                $suppliersData[$sid] = [
                    'supplier_id'    => $sid,
                    'supplier_name'  => $p->supplier_name,
                    'purchase_count' => 0,
                    'total_amount'   => 0,
                    'purchases'      => []
                ];
            }
            
            $pItems = $itemsByPurchase[$p->id] ?? [];
            if (empty($pItems) && $categoryId) {
                // If category filter was applied, and this purchase has NO items for that category, skip adding to result
                continue;
            }

            if ($invoicesLimitPerSupplier === null || count($suppliersData[$sid]['purchases']) < $invoicesLimitPerSupplier) {
                $suppliersData[$sid]['purchases'][] = [
                    'id'    => $p->id,
                    'total' => (float) $p->total,
                    'date'  => $p->created_at,
                    'items' => $pItems,
                ];
            }
            
            $suppliersData[$sid]['purchase_count']++;
            $suppliersData[$sid]['total_amount'] += (float)$p->total;
        }

        $result = array_values($suppliersData);
        usort($result, fn($a, $b) => $b['total_amount'] <=> $a['total_amount']);

        return $result;
    }


    public function loadMoreSupplierInvoices(
        int $supplierId,
        int $offset = 30,
        int $limit = 30,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?int $userId = null,
        ?int $categoryId = null,
        ?array $filterProductIds = null,
        ?string $searchName = null
    ): array {
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        $purchasesQuery = DB::table('purchases')
            ->whereNull('purchases.deleted_at')
            ->where('purchases.supplier_id', $supplierId)
            ->when($df,     fn($q) => $q->where('purchases.created_at', '>=', $df))
            ->when($dt,     fn($q) => $q->where('purchases.created_at', '<=', $dt))
            ->when($userId, fn($q) => $q->where('purchases.user_id', $userId));

        if ($categoryId) {
            $purchasesQuery->whereExists(fn($q) => $q->from('purchase_items')
                ->join('products', 'products.id', '=', 'purchase_items.product_id')
                ->whereColumn('purchase_items.purchase_id', 'purchases.id')
                ->where('products.category_id', $categoryId));
        }

        if (!empty($filterProductIds) || !empty($searchName)) {
            $purchasesQuery->whereExists(fn($q) => $q->from('purchase_items')
                ->join('products', 'products.id', '=', 'purchase_items.product_id')
                ->whereColumn('purchase_items.purchase_id', 'purchases.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        $totalPurchases = (clone $purchasesQuery)->count();

        $purchases = (clone $purchasesQuery)
            ->select('purchases.id', 'purchases.total', 'purchases.created_at')
            ->orderBy('purchases.created_at')
            ->skip($offset)
            ->take($limit)
            ->get();

        if ($purchases->isEmpty()) {
            return [
                'purchases'   => [],
                'has_more'    => false,
                'next_offset' => $offset,
            ];
        }

        $purchaseIds = $purchases->pluck('id')->toArray();

        $itemsQuery = DB::table('purchase_items')
            ->join('products', 'products.id', '=', 'purchase_items.product_id')
            ->whereIn('purchase_items.purchase_id', $purchaseIds)
            ->when($categoryId, fn($q) => $q->where('products.category_id', $categoryId))
            ->select(
                'purchase_items.purchase_id',
                'products.id as product_id',
                'products.name as product_name',
                'purchase_items.unit_cost',
                DB::raw('MIN(purchase_items.quantity) as quantity'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('purchase_items.purchase_id', 'products.id', 'products.name', 'purchase_items.unit_cost')
            ->get();

        $itemsByPurchase = [];
        foreach ($itemsQuery as $item) {
            $isMatched = false;
            if (!empty($filterProductIds) || !empty($searchName)) {
                if (!empty($filterProductIds) && in_array($item->product_id, $filterProductIds)) {
                    $isMatched = true;
                } elseif (!empty($searchName)) {
                    $terms = explode(',', $searchName);
                    foreach ($terms as $term) {
                        if (trim($term) !== '' && mb_stripos($item->product_name, trim($term)) !== false) {
                            $isMatched = true;
                            break;
                        }
                    }
                }
            }
            $item->is_matched = $isMatched;
            $itemsByPurchase[$item->purchase_id][] = (array)$item;
        }

        $purchasesFormatted = [];
        foreach ($purchases as $p) {
            $pItems = $itemsByPurchase[$p->id] ?? [];
            if (empty($pItems) && $categoryId) {
                continue;
            }
            $purchasesFormatted[] = [
                'id'    => $p->id,
                'total' => (float) $p->total,
                'date'  => $p->created_at,
                'items' => $pItems,
            ];
        }

        $nextOffset = $offset + count($purchasesFormatted);
        $hasMore    = $nextOffset < $totalPurchases;

        return [
            'purchases'   => $purchasesFormatted,
            'has_more'    => $hasMore,
            'next_offset' => $nextOffset,
        ];
    }


    public function exportPurchasesSupplierInvoicesExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        $this->excelExporter->exportPurchasesSupplierInvoicesExcel($this, $dateFrom, $dateTo, $userId, $supplierId, $categoryId, $filterProductIds, $searchName);
    }

    public function exportPurchasesSupplierInvoicesPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null, ?int $limit = 500, ?int $offset = 0): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportPurchasesSupplierInvoicesPdf($this, $dateFrom, $dateTo, $userId, $supplierId, $categoryId, $filterProductIds, $searchName, $limit, $offset);
    }

    public function returns(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        // مرتجعات العملاء
        $crQuery = DB::table('invoice_returns')
            ->whereNull('deleted_at')
            ->when($df,         fn($q) => $q->where('created_at', '>=', $df))
            ->when($dt,         fn($q) => $q->where('created_at', '<=', $dt))
            ->when($userId,     fn($q) => $q->where('user_id', $userId))
            ->when($customerId, fn($q) => $q->where('customer_id', $customerId));
        if ($categoryId) {
            $crQuery->whereExists(fn($q) => $q->from('invoice_return_items')
                ->join('products', 'products.id', '=', 'invoice_return_items.product_id')
                ->whereColumn('invoice_return_items.invoice_return_id', 'invoice_returns.id')
                ->where('products.category_id', $categoryId));
        }
        if (!empty($filterProductIds) || !empty($searchName)) {
            $crQuery->whereExists(fn($q) => $q->from('invoice_return_items')
                ->join('products', 'products.id', '=', 'invoice_return_items.product_id')
                ->whereColumn('invoice_return_items.invoice_return_id', 'invoice_returns.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        $customerReturnsTotal = (float) (clone $crQuery)->sum('total');
        $customerReturnsCount = (int)   (clone $crQuery)->count();

        // مرتجعات الموردين
        $prQuery = DB::table('purchase_returns')
            ->whereNull('deleted_at')
            ->when($df,         fn($q) => $q->where('created_at', '>=', $df))
            ->when($dt,         fn($q) => $q->where('created_at', '<=', $dt))
            ->when($userId,     fn($q) => $q->where('user_id', $userId))
            ->when($supplierId, fn($q) => $q->where('supplier_id', $supplierId));
        if ($categoryId) {
            $prQuery->whereExists(fn($q) => $q->from('purchase_return_items')
                ->join('products', 'products.id', '=', 'purchase_return_items.product_id')
                ->whereColumn('purchase_return_items.purchase_return_id', 'purchase_returns.id')
                ->where('products.category_id', $categoryId));
        }
        if (!empty($filterProductIds) || !empty($searchName)) {
            $prQuery->whereExists(fn($q) => $q->from('purchase_return_items')
                ->join('products', 'products.id', '=', 'purchase_return_items.product_id')
                ->whereColumn('purchase_return_items.purchase_return_id', 'purchase_returns.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }

        $supplierReturnsTotal = (float) (clone $prQuery)->sum('total');
        $supplierReturnsCount = (int)   (clone $prQuery)->count();

        // مبيعات للمقارنة
        $salesQuery = DB::table('invoices')
            ->whereNull('deleted_at')
            ->when($df,         fn($q) => $q->where('created_at', '>=', $df))
            ->when($dt,         fn($q) => $q->where('created_at', '<=', $dt))
            ->when($userId,     fn($q) => $q->where('user_id', $userId))
            ->when($customerId, fn($q) => $q->where('customer_id', $customerId));
        if (!empty($filterProductIds) || !empty($searchName)) {
            $salesQuery->whereExists(fn($q) => $q->from('invoice_items')
                ->join('products', 'products.id', '=', 'invoice_items.product_id')
                ->whereColumn('invoice_items.invoice_id', 'invoices.id')
                ->where(function($sub) use ($filterProductIds, $searchName) {
                    if (!empty($filterProductIds)) {
                        $sub->whereIn('products.id', $filterProductIds);
                    }
                    if ($searchName) {
                        $terms = explode(',', $searchName);
                        foreach ($terms as $term) {
                            $term = trim($term);
                            if ($term !== '') {
                                $sub->orWhere('products.name', 'like', '%' . $term . '%');
                            }
                        }
                    }
                }));
        }
        $totalSales = (float) $salesQuery->sum('total');

        // تفصيل شهري لمرتجعات العملاء
        $crMonthlyRows = (clone $crQuery)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw('DATE(created_at)'))->orderBy('date')->get();

        $crMonthly = [];
        foreach ($crMonthlyRows as $row) {
            $month = substr($row->date, 0, 7);
            if (!isset($crMonthly[$month])) $crMonthly[$month] = ['month' => $month, 'total' => 0, 'count' => 0, 'days' => []];
            $crMonthly[$month]['total'] += (float)$row->total;
            $crMonthly[$month]['count'] += (int)$row->count;
            $crMonthly[$month]['days'][] = ['date' => $row->date, 'total' => (float)$row->total, 'count' => (int)$row->count];
        }

        // تفصيل شهري لمرتجعات الموردين
        $prMonthlyRows = (clone $prQuery)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw('DATE(created_at)'))->orderBy('date')->get();

        $prMonthly = [];
        foreach ($prMonthlyRows as $row) {
            $month = substr($row->date, 0, 7);
            if (!isset($prMonthly[$month])) $prMonthly[$month] = ['month' => $month, 'total' => 0, 'count' => 0, 'days' => []];
            $prMonthly[$month]['total'] += (float)$row->total;
            $prMonthly[$month]['count'] += (int)$row->count;
            $prMonthly[$month]['days'][] = ['date' => $row->date, 'total' => (float)$row->total, 'count' => (int)$row->count];
        }

        $returnRate = $totalSales > 0 ? round(($customerReturnsTotal / $totalSales) * 100, 1) : null;

        return [
            'customerReturnsTotal' => $customerReturnsTotal,
            'customerReturnsCount' => $customerReturnsCount,
            'supplierReturnsTotal' => $supplierReturnsTotal,
            'supplierReturnsCount' => $supplierReturnsCount,
            'totalSales'           => $totalSales,
            'returnRate'           => $returnRate,
            'customerMonthly'      => array_values($crMonthly),
            'supplierMonthly'      => array_values($prMonthly),
        ];
    }


    public function exportReturnsExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        $this->excelExporter->exportReturnsExcel($this, $dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $filterProductIds, $searchName);
    }

    public function exportReturnsPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportReturnsPdf($this, $dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $filterProductIds, $searchName);
    }

    public function returnsDetails(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;
        $result = [];

        if ($type !== 'supplier') {
            $customersQuery = DB::table('customers')
                ->when($customerId, fn($q) => $q->where('id', $customerId))
                ->orderBy('name')->get(['id', 'name']);

            foreach ($customersQuery as $customer) {
                $returnsQuery = DB::table('invoice_returns')
                    ->whereNull('deleted_at')
                    ->where('customer_id', $customer->id)
                    ->when($df,     fn($q) => $q->where('created_at', '>=', $df))
                    ->when($dt,     fn($q) => $q->where('created_at', '<=', $dt))
                    ->when($userId, fn($q) => $q->where('user_id', $userId));
                if ($categoryId) {
                    $returnsQuery->whereExists(fn($q) => $q->from('invoice_return_items')
                        ->join('products', 'products.id', '=', 'invoice_return_items.product_id')
                        ->whereColumn('invoice_return_items.invoice_return_id', 'invoice_returns.id')
                        ->where('products.category_id', $categoryId));
                }
                if ($searchName) {
                    $returnsQuery->whereExists(fn($q) => $q->from('invoice_return_items')
                        ->join('products', 'products.id', '=', 'invoice_return_items.product_id')
                        ->whereColumn('invoice_return_items.invoice_return_id', 'invoice_returns.id')
                        ->where('products.name', 'like', '%' . $searchName . '%'));
                }
                $returns = $returnsQuery->select('id', 'total', 'created_at')->orderBy('created_at')->get();
                if ($returns->isEmpty()) continue;

                $returnsList = [];
                foreach ($returns as $r) {
                    $items = DB::table('invoice_return_items')
                        ->join('products', 'products.id', '=', 'invoice_return_items.product_id')
                        ->leftJoin('sizes', 'sizes.id', '=', 'invoice_return_items.size_id')
                        ->where('invoice_return_items.invoice_return_id', $r->id)
                        ->when($categoryId, fn($q) => $q->where('products.category_id', $categoryId))
                        ->select(
                            'products.name as product_name',
                            'invoice_return_items.unit_price',
                            'sizes.label as size_label',
                            DB::raw('MIN(invoice_return_items.quantity) as quantity'),
                            DB::raw('COUNT(*) as count'),
                            DB::raw('SUM(invoice_return_items.line_total) as line_total')
                        )
                        ->groupBy('products.name', 'invoice_return_items.unit_price', 'sizes.label')
                        ->get()
                        ->map(fn($i) => (object)[
                            'product_name' => $i->product_name,
                            'quantity'     => (float)$i->quantity,
                            'unit_price'   => (float)$i->unit_price,
                            'size_label'   => $i->size_label,
                            'count'        => (int)$i->count,
                            'line_total'   => (float)$i->line_total,
                        ]);
                    $returnsList[] = ['id' => $r->id, 'total' => (float)$r->total, 'date' => $r->created_at, 'items' => $items->toArray()];
                }

                $result[] = [
                    'entity_id'    => $customer->id,
                    'entity_name'  => $customer->name,
                    'entity_type'  => 'customer',
                    'return_count' => count($returnsList),
                    'total_amount' => round(array_sum(array_column($returnsList, 'total')), 2),
                    'returns'      => $returnsList,
                ];
            }
        }

        if ($type !== 'customer') {
            $suppliersQuery = DB::table('suppliers')
                ->when($supplierId, fn($q) => $q->where('id', $supplierId))
                ->orderBy('name')->get(['id', 'name']);

            foreach ($suppliersQuery as $supplier) {
                $returnsQuery = DB::table('purchase_returns')
                    ->whereNull('deleted_at')
                    ->where('supplier_id', $supplier->id)
                    ->when($df,     fn($q) => $q->where('created_at', '>=', $df))
                    ->when($dt,     fn($q) => $q->where('created_at', '<=', $dt))
                    ->when($userId, fn($q) => $q->where('user_id', $userId));
                if ($categoryId) {
                    $returnsQuery->whereExists(fn($q) => $q->from('purchase_return_items')
                        ->join('products', 'products.id', '=', 'purchase_return_items.product_id')
                        ->whereColumn('purchase_return_items.purchase_return_id', 'purchase_returns.id')
                        ->where('products.category_id', $categoryId));
                }
                if ($searchName) {
                    $returnsQuery->whereExists(fn($q) => $q->from('purchase_return_items')
                        ->join('products', 'products.id', '=', 'purchase_return_items.product_id')
                        ->whereColumn('purchase_return_items.purchase_return_id', 'purchase_returns.id')
                        ->where('products.name', 'like', '%' . $searchName . '%'));
                }
                $returns = $returnsQuery->select('id', 'total', 'created_at')->orderBy('created_at')->get();
                if ($returns->isEmpty()) continue;

                $returnsList = [];
                foreach ($returns as $r) {
                    $hasPriSize = Schema::hasColumn('purchase_return_items', 'size_id');
                    $priQuery = DB::table('purchase_return_items')
                        ->join('products', 'products.id', '=', 'purchase_return_items.product_id')
                        ->where('purchase_return_items.purchase_return_id', $r->id)
                        ->when($categoryId, fn($q) => $q->where('products.category_id', $categoryId));

                    if ($hasPriSize) {
                        $priQuery->leftJoin('sizes', 'sizes.id', '=', 'purchase_return_items.size_id')
                            ->select(
                                'products.name as product_name',
                                'purchase_return_items.unit_cost as unit_price',
                                'sizes.label as size_label',
                                DB::raw('MIN(purchase_return_items.quantity) as quantity'),
                                DB::raw('COUNT(*) as count'),
                                DB::raw('SUM(purchase_return_items.line_total) as line_total')
                            )
                            ->groupBy('products.name', 'purchase_return_items.unit_cost', 'sizes.label');
                    } else {
                        $priQuery->select(
                                'products.name as product_name',
                                'purchase_return_items.unit_cost as unit_price',
                                DB::raw('NULL as size_label'),
                                DB::raw('MIN(purchase_return_items.quantity) as quantity'),
                                DB::raw('COUNT(*) as count'),
                                DB::raw('SUM(purchase_return_items.line_total) as line_total')
                            )
                            ->groupBy('products.name', 'purchase_return_items.unit_cost');
                    }

                    $items = $priQuery->get()
                        ->map(fn($i) => (object)[
                            'product_name' => $i->product_name,
                            'quantity'     => (float)$i->quantity,
                            'unit_price'   => (float)$i->unit_price,
                            'size_label'   => $i->size_label,
                            'count'        => (int)$i->count,
                            'line_total'   => (float)$i->line_total,
                        ]);
                    $returnsList[] = ['id' => $r->id, 'total' => (float)$r->total, 'date' => $r->created_at, 'items' => $items->toArray()];
                }

                $result[] = [
                    'entity_id'    => $supplier->id,
                    'entity_name'  => $supplier->name,
                    'entity_type'  => 'supplier',
                    'return_count' => count($returnsList),
                    'total_amount' => round(array_sum(array_column($returnsList, 'total')), 2),
                    'returns'      => $returnsList,
                ];
            }
        }

        usort($result, fn($a, $b) => $b['total_amount'] <=> $a['total_amount']);
        return $result;
    }


    public function exportReturnsDetailsExcel(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): void
    {
        $this->excelExporter->exportReturnsDetailsExcel($this, $dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $type, $searchName);
    }

    public function exportReturnsDetailsPdf(?string $dateFrom, ?string $dateTo, ?int $userId, ?int $customerId, ?int $supplierId, ?int $categoryId, string $type, ?string $searchName = null): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportReturnsDetailsPdf($this, $dateFrom, $dateTo, $userId, $customerId, $supplierId, $categoryId, $type, $searchName);
    }

    public function profitAnalysis(array $productIds, ?string $dateFrom, ?string $dateTo, ?int $categoryId = null): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        $dateFromFull = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dateToFull   = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        $query = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->when(count($productIds) > 0, fn($q) => $q->whereIn('products.id', $productIds))
            ->when($categoryId, fn($q) => $q->where('products.category_id', $categoryId))
            ->select(
                'products.id',
                'products.name',
                'products.stock',
                'categories.name as category_name',
                'categories.unit',
            )
            ->orderBy('products.name')
            ->get();

        return $query->map(function ($p) use ($dateFromFull, $dateToFull) {
            $currentStock = (float)$p->stock;

            // ── حساب رصيد أول الفترة ──────────────────────────────────────
            if ($dateFromFull) {
                $purchasesAfter = (float) DB::table('purchase_items')
                    ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
                    ->whereNull('purchases.deleted_at')
                    ->where('purchase_items.product_id', $p->id)
                    ->where('purchases.created_at', '>=', $dateFromFull)
                    ->sum('purchase_items.quantity');

                $salesAfter = (float) DB::table('invoice_items')
                    ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                    ->whereNull('invoices.deleted_at')
                    ->where('invoice_items.product_id', $p->id)
                    ->where('invoices.created_at', '>=', $dateFromFull)
                    ->sum('invoice_items.quantity');

                $returnInAfter = (float) DB::table('invoice_return_items')
                    ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
                    ->whereNull('invoice_returns.deleted_at')
                    ->where('invoice_return_items.product_id', $p->id)
                    ->where('invoice_returns.created_at', '>=', $dateFromFull)
                    ->sum('invoice_return_items.quantity');

                $returnOutAfter = (float) DB::table('purchase_return_items')
                    ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
                    ->whereNull('purchase_returns.deleted_at')
                    ->where('purchase_return_items.product_id', $p->id)
                    ->where('purchase_returns.created_at', '>=', $dateFromFull)
                    ->sum('purchase_return_items.quantity');

                $wasteAfter = (float) DB::table('waste_items')
                    ->join('waste_logs', 'waste_logs.id', '=', 'waste_items.waste_log_id')
                    ->where('waste_items.product_id', $p->id)
                    ->where('waste_logs.created_at', '>=', $dateFromFull)
                    ->sum('waste_items.quantity');

                $openingStock = $currentStock
                    - $purchasesAfter
                    + $salesAfter
                    - $returnInAfter
                    + $returnOutAfter
                    + $wasteAfter;
            } else {
                $openingStock = 0;
            }

            // ── المشتريات في الفترة ──────────────────────────────────────
            $purchaseQuery = DB::table('purchase_items')
                ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
                ->whereNull('purchases.deleted_at')
                ->where('purchase_items.product_id', $p->id)
                ->when($dateFromFull, fn($q) => $q->where('purchases.created_at', '>=', $dateFromFull))
                ->when($dateToFull,   fn($q) => $q->where('purchases.created_at', '<=', $dateToFull));

            $totalPurchaseQty  = (float) (clone $purchaseQuery)->sum('purchase_items.quantity');
            $totalPurchaseCost = (float) (clone $purchaseQuery)->sum('purchase_items.line_total');
            $avgPurchaseCost   = $totalPurchaseQty > 0 ? $totalPurchaseCost / $totalPurchaseQty : null;

            // ── المبيعات في الفترة ──────────────────────────────────────
            $saleQuery = DB::table('invoice_items')
                ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
                ->whereNull('invoices.deleted_at')
                ->where('invoice_items.product_id', $p->id)
                ->when($dateFromFull, fn($q) => $q->where('invoices.created_at', '>=', $dateFromFull))
                ->when($dateToFull,   fn($q) => $q->where('invoices.created_at', '<=', $dateToFull));

            $totalSoldQty   = (float) (clone $saleQuery)->sum('invoice_items.quantity');
            $totalSaleValue = (float) (clone $saleQuery)->sum('invoice_items.line_total');

            // الربح = إجمالي قيمة المبيعات - (متوسط تكلفة الشراء × الكمية المباعة)
            $profit = null;
            if ($totalSoldQty > 0) {
                $cost = $avgPurchaseCost ?? 0;
                $profit = round($totalSaleValue - ($cost * $totalSoldQty), 2);
            }

            return [
                'id'                  => $p->id,
                'name'                => $p->name,
                'category'            => $p->category_name,
                'unit'                => $p->unit,
                'opening_stock'       => round((float)$openingStock, 2),
                'total_purchase_cost' => round($totalPurchaseCost, 2),
                'total_purchase_qty'  => round($totalPurchaseQty, 2),
                'total_sale_value'    => round($totalSaleValue, 2),
                'total_sold_qty'      => round($totalSoldQty, 2),
                'profit'              => $profit,
            ];
        })->values()->toArray();
    }


    public function dailyProfitSummary(?string $dateFrom, ?string $dateTo, ?array $filterProductIds = null, ?int $periodId = null, ?string $searchName = null): array
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(180);
        if ($searchName) {
            $searchNames = explode(',', $searchName);
            $q = DB::table('products');
            $q->where(function ($sub) use ($searchNames) {
                foreach ($searchNames as $name) {
                    $sub->orWhere('name', 'like', '%' . trim($name) . '%');
                }
            });
            $matchedIds = $q->pluck('id')->toArray();

            if ($filterProductIds !== null) {
                $filterProductIds = array_unique(array_merge($filterProductIds, $matchedIds));
                if (empty($filterProductIds)) $filterProductIds = [0];
            } else {
                $filterProductIds = empty($matchedIds) ? [0] : $matchedIds;
            }
        }
        $df = $dateFrom ? $dateFrom . ' 00:00:00' : now()->startOfMonth()->toDateTimeString();
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : now()->endOfMonth()->toDateTimeString();

        // 1. Get products sold or returned in the period
        $soldProductIds = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereNull('invoices.deleted_at')
            ->whereBetween('invoices.created_at', [$df, $dt])
            ->when($periodId, fn($q) => $q->where(fn($sub) => $sub->where('invoices.period_id', $periodId)->orWhereNull('invoices.period_id')))
            ->when(!empty($filterProductIds), fn($q) => $q->whereIn('invoice_items.product_id', $filterProductIds))
            ->pluck('invoice_items.product_id')
            ->unique()
            ->toArray();

        $returnedProductIds = DB::table('invoice_return_items')
            ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
            ->whereNull('invoice_returns.deleted_at')
            ->whereBetween('invoice_returns.created_at', [$df, $dt])
            ->when($periodId, fn($q) => $q->where(fn($sub) => $sub->where('invoice_returns.period_id', $periodId)->orWhereNull('invoice_returns.period_id')))
            ->when(!empty($filterProductIds), fn($q) => $q->whereIn('invoice_return_items.product_id', $filterProductIds))
            ->pluck('invoice_return_items.product_id')
            ->unique()
            ->toArray();

        $productIds = array_unique(array_merge($soldProductIds, $returnedProductIds));
        
        if (empty($productIds)) {
            return ['total_profit' => 0, 'monthly' => [], 'daily' => [], 'included_products' => collect([])];
        }

        $previousSnapshotId = null;
        if ($periodId) {
            $previousSnapshotId = DB::table('period_snapshots')->where('period_id', '<', $periodId)->orderBy('period_id', 'desc')->value('id');
        } else {
            $previousSnapshotId = DB::table('period_snapshots')->orderBy('id', 'desc')->value('id');
        }

        $fallbackCosts = [];
        $fallbackStocks = [];
        if ($previousSnapshotId) {
            $stockProfits = DB::table('period_snapshot_stock_profits')
                ->where('snapshot_id', $previousSnapshotId)
                ->whereIn('product_id', $productIds)
                ->get(['product_id', 'avg_purchase_cost', 'stock']);

            foreach ($stockProfits as $sp) {
                if ($sp->avg_purchase_cost !== null) $fallbackCosts[$sp->product_id] = (float) $sp->avg_purchase_cost;
                $fallbackStocks[$sp->product_id] = (float) $sp->stock;
            }
        }

        $scopePeriod = function ($q, string $table) use ($periodId) {
            if ($periodId) {
                $q->where(fn($sq) => $sq->where("{$table}.period_id", $periodId)->orWhereNull("{$table}.period_id"));
            }
        };

        // 2. Fetch ALL Events up to $dt for Timeline
        $events = [];

        $purchases = DB::table('purchase_items')
            ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
            ->whereNull('purchases.deleted_at')
            ->whereIn('purchase_items.product_id', $productIds)
            ->where('purchases.created_at', '<=', $dt)
            ->tap(fn($q) => $scopePeriod($q, 'purchases'))
            ->select('purchase_items.product_id as pid', 'purchase_items.quantity as qty', 'purchase_items.line_total as val', 'purchases.created_at as date', 'purchases.id')
            ->get();
        foreach ($purchases as $row) $events[] = ['date' => $row->date, 'type' => 1, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'id' => $row->id];

        $sales = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->whereNull('invoices.deleted_at')
            ->whereIn('invoice_items.product_id', $productIds)
            ->where('invoices.created_at', '<=', $dt)
            ->tap(fn($q) => $scopePeriod($q, 'invoices'))
            ->select('invoice_items.product_id as pid', 'invoice_items.quantity as qty', 'invoice_items.line_total as val', 'invoices.created_at as date', 'invoices.id')
            ->get();
        foreach ($sales as $row) $events[] = ['date' => $row->date, 'type' => 2, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'id' => $row->id];

        $returnsIn = DB::table('invoice_return_items')
            ->join('invoice_returns', 'invoice_returns.id', '=', 'invoice_return_items.invoice_return_id')
            ->whereNull('invoice_returns.deleted_at')
            ->whereIn('invoice_return_items.product_id', $productIds)
            ->where('invoice_returns.created_at', '<=', $dt)
            ->tap(fn($q) => $scopePeriod($q, 'invoice_returns'))
            ->select('invoice_return_items.product_id as pid', 'invoice_return_items.quantity as qty', 'invoice_return_items.line_total as val', 'invoice_returns.created_at as date', 'invoice_returns.id')
            ->get();
        foreach ($returnsIn as $row) $events[] = ['date' => $row->date, 'type' => 3, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'id' => $row->id];

        $returnsOut = DB::table('purchase_return_items')
            ->join('purchase_returns', 'purchase_returns.id', '=', 'purchase_return_items.purchase_return_id')
            ->whereNull('purchase_returns.deleted_at')
            ->whereIn('purchase_return_items.product_id', $productIds)
            ->where('purchase_returns.created_at', '<=', $dt)
            ->tap(fn($q) => $scopePeriod($q, 'purchase_returns'))
            ->select('purchase_return_items.product_id as pid', 'purchase_return_items.quantity as qty', 'purchase_return_items.line_total as val', 'purchase_returns.created_at as date', 'purchase_returns.id')
            ->get();
        foreach ($returnsOut as $row) $events[] = ['date' => $row->date, 'type' => 4, 'pid' => $row->pid, 'qty' => (float)$row->qty, 'val' => (float)$row->val, 'id' => $row->id];

        // 3. Sort Events (Timeline logic)
        usort($events, function($a, $b) {
            if ($a['date'] != $b['date']) return $a['date'] <=> $b['date'];
            if ($a['type'] != $b['type']) return $a['type'] <=> $b['type'];
            return $a['id'] <=> $b['id'];
        });

        // 4. Run Timeline Simulation
        $state = [];
        $dailyData = [];
        $totalProfit = 0;

        foreach ($events as $e) {
            $pid = $e['pid'];
            if (!isset($state[$pid])) {
                $state[$pid] = [
                    'qty' => $fallbackStocks[$pid] ?? 0.0,
                    'val' => ($fallbackStocks[$pid] ?? 0.0) * ($fallbackCosts[$pid] ?? 0.0),
                    'cost' => $fallbackCosts[$pid] ?? 0.0
                ];
            }
            $st = &$state[$pid];
            $dateOnly = substr($e['date'], 0, 10);
            $inRange = ($e['date'] >= $df);

            if ($inRange && !isset($dailyData[$dateOnly])) {
                $dailyData[$dateOnly] = ['date' => $dateOnly, 'sales' => 0, 'returns' => 0, 'cost_of_sales' => 0, 'cost_of_returns' => 0];
            }

            if ($e['type'] === 1) { // Buy
                $st['qty'] += $e['qty'];
                $st['val'] += $e['val'];
                if ($st['qty'] > 0) $st['cost'] = $st['val'] / $st['qty'];
            } elseif ($e['type'] === 4) { // Buy Return
                $st['qty'] -= $e['qty'];
                $st['val'] -= $e['qty'] * ($e['val'] / $e['qty']);
                if ($st['qty'] > 0) $st['cost'] = $st['val'] / $st['qty'];
            } elseif ($e['type'] === 2) { // Sale
                $cogs = $e['qty'] * $st['cost'];
                $st['qty'] -= $e['qty'];
                $st['val'] -= $cogs;
                if ($inRange) {
                    $dailyData[$dateOnly]['sales'] += $e['val'];
                    $dailyData[$dateOnly]['cost_of_sales'] += $cogs;
                }
            } elseif ($e['type'] === 3) { // Sale Return
                $cor = $e['qty'] * $st['cost'];
                $st['qty'] += $e['qty'];
                $st['val'] += $cor;
                if ($inRange) {
                    $dailyData[$dateOnly]['returns'] += $e['val'];
                    $dailyData[$dateOnly]['cost_of_returns'] += $cor;
                }
            }
        }

        ksort($dailyData);
        $daily = [];
        $monthlyData = [];

        foreach ($dailyData as $date => $data) {
            $netSales = $data['sales'] - $data['returns'];
            $netCost = $data['cost_of_sales'] - $data['cost_of_returns'];
            $profit = $netSales - $netCost;
            $totalProfit += $profit;
            
            $dayRow = [
                'date' => $date,
                'sales' => $data['sales'],
                'returns' => $data['returns'],
                'net_sales' => $netSales,
                'profit' => round($profit, 2)
            ];
            $daily[] = $dayRow;

            $month = substr($date, 0, 7);
            if (!isset($monthlyData[$month])) {
                $monthlyData[$month] = ['month' => $month, 'sales' => 0, 'returns' => 0, 'net_sales' => 0, 'profit' => 0, 'days' => []];
            }
            $monthlyData[$month]['sales'] += $data['sales'];
            $monthlyData[$month]['returns'] += $data['returns'];
            $monthlyData[$month]['net_sales'] += $netSales;
            $monthlyData[$month]['profit'] += $profit;
            $monthlyData[$month]['days'][] = $dayRow;
        }

        foreach ($monthlyData as &$m) {
            $m['profit'] = round($m['profit'], 2);
        }

        $includedProducts = $this->getIncludedProducts($productIds, $searchName);

        return [
            'total_profit' => round($totalProfit, 2),
            'monthly' => array_values($monthlyData),
            'daily' => $daily,
            'included_products' => $includedProducts
        ];
    }


    public function exportProfitAnalysisExcel(?string $dateFrom, ?string $dateTo, ?array $filterProductIds = null, ?string $searchName = null): void
    {
        $this->excelExporter->exportProfitAnalysisExcel($this, $dateFrom, $dateTo, $filterProductIds, $searchName);
    }

    public function exportProfitAnalysisPdf(?string $dateFrom, ?string $dateTo, ?array $filterProductIds = null, ?string $searchName = null): \Illuminate\Http\Response
    {
        return $this->pdfExporter->exportProfitAnalysisPdf($this, $dateFrom, $dateTo, $filterProductIds, $searchName);
    }
}
