<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use App\Repositories\Contracts\ReportRepositoryInterface;

class RunScalabilityTest extends Command
{
    protected $signature = 'stress:scale';
    protected $description = 'Run a Scalability Test on different dataset sizes (10K to 250K) and generate a Markdown report.';

    public function handle()
    {
        ini_set('memory_limit', '-1');
        set_time_limit(0);

        $scales = [10000, 25000, 50000, 100000, 250000];
        $results = [];

        $repo = app(ReportRepositoryInterface::class);

        $this->info("Starting Scalability Test...");

        foreach ($scales as $scale) {
            $this->info("\n=========================================");
            $this->info("🚀 Testing Scale: " . number_format($scale) . " Sales Invoices");
            $this->info("=========================================");

            $this->wipeDatabase();
            $this->generateMasterData();
            $this->generateTransactions($scale);

            // Give MySQL a second to flush indexes
            sleep(2);

            $dateFrom = Carbon::now()->subYear()->toDateString();
            $dateTo = Carbon::now()->toDateString();

            $tests = [
                'Profit Analysis' => fn() => $repo->dailyProfitSummary($dateFrom, $dateTo),
                'Stock Status' => fn() => $repo->stockStatus(null, null, false),
                'Customer Invoices' => fn() => $repo->salesCustomerInvoices($dateFrom, $dateTo, null, null, null, null),
                'Customer Aging' => fn() => $repo->customerAging(null, $dateFrom, $dateTo),
                'Supplier Aging' => fn() => $repo->supplierAging(null, $dateFrom, $dateTo),
                'Sales Summary' => fn() => $repo->sales($dateFrom, $dateTo, null, null, null, null, false),
                'Purchases Summary' => fn() => $repo->purchases($dateFrom, $dateTo, null, null, null, false),
            ];

            foreach ($tests as $name => $closure) {
                $this->info("Running $name...");
                
                DB::flushQueryLog();
                DB::enableQueryLog();
                $memStart = memory_get_usage();
                $timeStart = microtime(true);

                $closure();

                $timeEnd = microtime(true);
                $memEnd = memory_get_usage();
                $queries = count(DB::getQueryLog());
                DB::disableQueryLog();

                $results[$scale][$name] = [
                    'time' => round($timeEnd - $timeStart, 3),
                    'memory' => round(($memEnd - $memStart) / 1024 / 1024, 2),
                    'queries' => $queries
                ];
            }
        }

        $this->generateMarkdownTables($results, $scales);
    }

    private function generateMarkdownTables($results, $scales)
    {
        $this->info("\n\n# 📊 Scalability Test Results\n");

        $reports = array_keys($results[$scales[0]]);

        // 1. Time Table
        $this->info("## ⏱️ Execution Time (Seconds)");
        $header = "| Dataset | " . implode(" | ", $reports) . " |";
        $this->info($header);
        $separator = "|---|" . str_repeat("---|", count($reports));
        $this->info($separator);
        
        foreach ($scales as $scale) {
            $row = "| " . number_format($scale) . " | ";
            foreach ($reports as $report) {
                $row .= number_format($results[$scale][$report]['time'], 2) . "s | ";
            }
            $this->info($row);
        }

        // 2. Memory Table
        $this->info("\n## 🧠 Peak Memory Usage (MB)");
        $this->info($header);
        $this->info($separator);
        foreach ($scales as $scale) {
            $row = "| " . number_format($scale) . " | ";
            foreach ($reports as $report) {
                $row .= number_format($results[$scale][$report]['memory'], 2) . "MB | ";
            }
            $this->info($row);
        }

        // 3. Queries Table
        $this->info("\n## 🗄️ Number of SQL Queries");
        $this->info($header);
        $this->info($separator);
        foreach ($scales as $scale) {
            $row = "| " . number_format($scale) . " | ";
            foreach ($reports as $report) {
                $row .= number_format($results[$scale][$report]['queries']) . " | ";
            }
            $this->info($row);
        }

        // 4. Growth Analysis (Profit Analysis & Customer Invoices)
        $this->info("\n## 📈 Growth Analysis (O(n) Check)");
        $this->info("| Dataset | Profit Time | Customer Inv Time | Multiplier |");
        $this->info("|---|---|---|---|");
        
        $baseTimeProfit = $results[$scales[0]]['Profit Analysis']['time'];
        $baseTimeInv = $results[$scales[0]]['Customer Invoices']['time'];

        foreach ($scales as $scale) {
            $t1 = $results[$scale]['Profit Analysis']['time'];
            $t2 = $results[$scale]['Customer Invoices']['time'];
            
            $growth1 = $baseTimeProfit > 0 ? round($t1 / $baseTimeProfit, 2) : 1;
            $growth2 = $baseTimeInv > 0 ? round($t2 / $baseTimeInv, 2) : 1;
            
            $this->info("| " . number_format($scale) . " | {$t1}s | {$t2}s | x{$growth1} (Profit), x{$growth2} (Inv) |");
        }

        $this->info("\nTest Completed successfully.");
    }

    private function wipeDatabase()
    {
        Schema::disableForeignKeyConstraints();
        DB::table('waste_items')->truncate();
        DB::table('waste_logs')->truncate();
        DB::table('purchase_return_items')->truncate();
        DB::table('purchase_returns')->truncate();
        DB::table('invoice_return_items')->truncate();
        DB::table('invoice_returns')->truncate();
        DB::table('purchase_items')->truncate();
        DB::table('purchases')->truncate();
        DB::table('invoice_items')->truncate();
        DB::table('invoices')->truncate();
        DB::table('settlements')->truncate();
        DB::table('payments')->truncate();
        DB::table('products')->truncate();
        DB::table('customers')->truncate();
        DB::table('suppliers')->truncate();
        DB::table('period_snapshots')->truncate();
        DB::table('period_snapshot_stock_profits')->truncate();
        DB::table('period_snapshot_items')->truncate();
        DB::table('period_snapshot_daily_profits')->truncate();
        Schema::enableForeignKeyConstraints();
    }

    private function generateMasterData()
    {
        $categories = DB::table('categories')->pluck('id')->toArray();
        if (empty($categories)) {
            $catId = DB::table('categories')->insertGetId(['name' => 'General', 'unit' => 'Pcs']);
            $categories = [$catId];
        }

        $products = [];
        for ($i = 1; $i <= 1000; $i++) {
            $products[] = [
                'name' => "Stress Product $i",
                'category_id' => $categories[array_rand($categories)],
                'stock' => 0,
                'min_stock' => rand(5, 20),
                'price_tier_id' => null,
                'selling_type' => 'unit_priced',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        $chunks = array_chunk($products, 500);
        foreach ($chunks as $chunk) DB::table('products')->insert($chunk);

        $customers = [];
        for ($i = 1; $i <= 500; $i++) {
            $customers[] = [
                'name' => "Customer $i",
                'phone' => '09' . str_pad($i, 8, '0', STR_PAD_LEFT),
                'opening_balance' => 0,
                'total_debt' => 0,
                'total_purchases' => 0,
                'total_paid' => 0,
                'total_returns' => 0,
                'total_settlements' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        $chunks = array_chunk($customers, 500);
        foreach ($chunks as $chunk) DB::table('customers')->insert($chunk);

        $suppliers = [];
        for ($i = 1; $i <= 100; $i++) {
            $suppliers[] = [
                'name' => "Supplier $i",
                'phone' => '09' . str_pad($i + 5000, 8, '0', STR_PAD_LEFT),
                'opening_balance' => 0,
                'total_debt' => 0,
                'total_purchases' => 0,
                'total_paid' => 0,
                'total_returns' => 0,
                'total_settlements' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('suppliers')->insert($suppliers);
    }

    private function generateTransactions($salesCount)
    {
        $userId = DB::table('users')->value('id') ?? 1;
        $periodId = DB::table('accounting_periods')->insertGetId([
            'name' => "Scale Period $salesCount",
            'started_at' => Carbon::now()->subYears(3),
            'status' => 'open',
            'created_by' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $startDate = Carbon::now()->subYears(3);
        $endDate = Carbon::now();
        $daysDiff = $startDate->diffInDays($endDate);

        $productIds = DB::table('products')->pluck('id')->toArray();
        $customerIds = DB::table('customers')->pluck('id')->toArray();
        $supplierIds = DB::table('suppliers')->pluck('id')->toArray();

        $randomDate = function() use ($startDate, $daysDiff) {
            return $startDate->copy()->addDays(rand(0, $daysDiff))->addSeconds(rand(0, 86400));
        };

        // Purchases (30% of sales volume)
        $purchasesCount = (int)($salesCount * 0.3);
        $purId = 1; $purItemId = 1;
        $purchases = []; $purchaseItems = [];
        
        for ($i = 1; $i <= $purchasesCount; $i++) {
            $date = $randomDate();
            $supplierId = $supplierIds[array_rand($supplierIds)];
            $total = 0;
            
            $numItems = rand(1, 5);
            $items = [];
            for ($j = 0; $j < $numItems; $j++) {
                $pid = $productIds[array_rand($productIds)];
                $qty = rand(10, 100);
                $cost = rand(10, 100) / 10;
                $lineTotal = $qty * $cost;
                $total += $lineTotal;

                $items[] = [
                    'id' => $purItemId++,
                    'period_id' => $periodId,
                    'purchase_id' => $purId,
                    'product_id' => $pid,
                    'quantity' => $qty,
                    'unit_cost' => $cost,
                    'line_total' => $lineTotal,
                    'created_at' => $date,
                ];
            }

            $purchases[] = [
                'id' => $purId,
                'period_id' => $periodId,
                'supplier_id' => $supplierId,
                'user_id' => $userId,
                'total' => $total,
                'paid_amount' => 0,
                'due_amount' => $total,
                'payment_status' => 'unpaid',
                'created_at' => $date,
                'updated_at' => $date,
            ];
            $purchaseItems = array_merge($purchaseItems, $items);
            $purId++;

            if (count($purchases) >= 1000) {
                DB::table('purchases')->insert($purchases);
                DB::table('purchase_items')->insert($purchaseItems);
                $purchases = []; $purchaseItems = [];
            }
        }
        if (!empty($purchases)) {
            DB::table('purchases')->insert($purchases);
            DB::table('purchase_items')->insert($purchaseItems);
        }

        // Sales
        $invId = 1; $invItemId = 1;
        $invoices = []; $invoiceItems = [];
        
        for ($i = 1; $i <= $salesCount; $i++) {
            $date = $randomDate();
            $customerId = $customerIds[array_rand($customerIds)];
            $total = 0;
            
            $numItems = rand(1, 4);
            $items = [];
            for ($j = 0; $j < $numItems; $j++) {
                $pid = $productIds[array_rand($productIds)];
                $qty = rand(1, 5);
                $price = rand(15, 150) / 10;
                $lineTotal = $qty * $price;
                $total += $lineTotal;

                $items[] = [
                    'id' => $invItemId++,
                    'period_id' => $periodId,
                    'invoice_id' => $invId,
                    'product_id' => $pid,
                    'sale_type' => 'unit_based',
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'line_total' => $lineTotal,
                    'created_at' => $date,
                ];
            }

            $invoices[] = [
                'id' => $invId,
                'period_id' => $periodId,
                'customer_id' => $customerId,
                'user_id' => $userId,
                'total' => $total,
                'paid_amount' => 0,
                'due_amount' => $total,
                'payment_status' => 'unpaid',
                'customer_type' => 'regular',
                'created_at' => $date,
                'updated_at' => $date,
            ];
            $invoiceItems = array_merge($invoiceItems, $items);
            $invId++;

            if (count($invoices) >= 1000) {
                DB::table('invoices')->insert($invoices);
                DB::table('invoice_items')->insert($invoiceItems);
                $invoices = []; $invoiceItems = [];
            }
        }
        if (!empty($invoices)) {
            DB::table('invoices')->insert($invoices);
            DB::table('invoice_items')->insert($invoiceItems);
        }
    }
}
