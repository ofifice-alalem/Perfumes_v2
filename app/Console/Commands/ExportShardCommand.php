<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExportShardCommand extends Command
{
    protected $signature = 'export:shard {type} {shard} {totalShards} {outputFile} {--date_from=} {--date_to=} {--user_id=} {--customer_id=} {--supplier_id=}';
    protected $description = 'Process and render a specific parallel export shard';

    public function handle()
    {
        $type        = $this->argument('type');
        $shard       = (int) $this->argument('shard');
        $totalShards = (int) $this->argument('totalShards');
        $outputFile  = $this->argument('outputFile');

        $dateFrom   = $this->option('date_from');
        $dateTo     = $this->option('date_to');
        $userId     = $this->option('user_id') ? (int)$this->option('user_id') : null;
        $customerId = $this->option('customer_id') ? (int)$this->option('customer_id') : null;
        $supplierId = $this->option('supplier_id') ? (int)$this->option('supplier_id') : null;

        $df = $dateFrom ? $dateFrom . ' 00:00:00' : null;
        $dt = $dateTo   ? $dateTo   . ' 23:59:59' : null;

        if ($type === 'sales_customer') {
            $this->exportSalesCustomerShard($shard, $totalShards, $outputFile, $df, $dt, $userId, $customerId);
        }

        return 0;
    }

    private function exportSalesCustomerShard(int $shard, int $totalShards, string $outputFile, ?string $df, ?string $dt, ?int $userId, ?int $customerId): void
    {
        // Fetch all customer IDs matching filters
        $customerIds = DB::table('invoices')
            ->whereNull('invoices.deleted_at')
            ->when($customerId, fn($q) => $q->where('invoices.customer_id', $customerId))
            ->when($df,     fn($q) => $q->where('invoices.created_at', '>=', $df))
            ->when($dt,     fn($q) => $q->where('invoices.created_at', '<=', $dt))
            ->when($userId, fn($q) => $q->where('invoices.user_id', $userId))
            ->distinct()
            ->pluck('customer_id')
            ->toArray();

        sort($customerIds);
        $totalCustomers = count($customerIds);

        if ($totalCustomers === 0) {
            file_put_contents($outputFile, '');
            return;
        }

        // Shard partitioning
        $chunkSize = (int) ceil($totalCustomers / $totalShards);
        $offset    = ($shard - 1) * $chunkSize;
        $shardCustomerIds = array_slice($customerIds, $offset, $chunkSize);

        if (empty($shardCustomerIds)) {
            file_put_contents($outputFile, '');
            return;
        }

        $isWhole = fn($n) => $n == floor($n);
        $fmtN    = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);

        $fp = fopen($outputFile, 'w');

        foreach ($shardCustomerIds as $cid) {
            $customerName = DB::table('customers')->where('id', $cid)->value('name') ?? 'زبون';

            $invoices = DB::table('invoices')
                ->whereNull('deleted_at')
                ->where('customer_id', $cid)
                ->when($df,     fn($q) => $q->where('created_at', '>=', $df))
                ->when($dt,     fn($q) => $q->where('created_at', '<=', $dt))
                ->when($userId, fn($q) => $q->where('user_id', $userId))
                ->select('id', 'total', 'created_at')
                ->orderBy('created_at')
                ->get();

            if ($invoices->isEmpty()) continue;

            $invCount    = count($invoices);
            $totalAmount = $invoices->sum('total');

            fputcsv($fp, [$customerName . ' — ' . $invCount . ' فاتورة — ' . $fmtN($totalAmount)]);

            $invIds = $invoices->pluck('id')->toArray();
            $invChunks = array_chunk($invIds, 5000);

            foreach ($invChunks as $chunk) {
                $items = DB::table('invoice_items')
                    ->join('products', 'products.id', '=', 'invoice_items.product_id')
                    ->leftJoin('sizes', 'sizes.id', '=', 'invoice_items.size_id')
                    ->whereIn('invoice_items.invoice_id', $chunk)
                    ->select(
                        'invoice_items.invoice_id',
                        'products.name as product_name',
                        'invoice_items.unit_price',
                        'invoice_items.sale_type',
                        'sizes.value as size_value',
                        DB::raw('SUM(invoice_items.quantity) as total_quantity'),
                        DB::raw('SUM(invoice_items.line_total) as line_total')
                    )
                    ->groupBy('invoice_items.invoice_id', 'products.id', 'products.name', 'invoice_items.unit_price', 'invoice_items.sale_type', 'sizes.value')
                    ->get();

                $itemsByInv = [];
                foreach ($items as $item) {
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
                    $itemsByInv[$item->invoice_id][] = (array)$item;
                }

                foreach ($invoices as $inv) {
                    if (!isset($itemsByInv[$inv->id])) continue;

                    fputcsv($fp, ['INV#' . $inv->id, substr($inv->created_at, 0, 10), $fmtN($inv->total)]);
                    fputcsv($fp, ['العدد', 'المنتج', 'الحجم', 'السعر', 'الإجمالي']);

                    foreach ($itemsByInv[$inv->id] as $item) {
                        fputcsv($fp, [
                            $item['count'] > 1 ? $item['count'] : '',
                            $item['product_name'],
                            $fmtN($item['quantity']),
                            $fmtN($item['unit_price']),
                            $fmtN($item['line_total']),
                        ]);
                    }
                }
            }

            fputcsv($fp, ['الإجمالي', '', '', '', $fmtN($totalAmount)]);
            fputcsv($fp, []);
        }

        fclose($fp);
    }
}
