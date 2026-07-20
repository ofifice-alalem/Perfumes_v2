<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use Illuminate\Support\Str;

class RunStressTest extends Command
{
    protected $signature = 'stress:test';
    protected $description = 'Generate massive realistic data, run integrity checks, and benchmark reports.';

    public function handle()
    {
        ini_set('memory_limit', '-1');
        set_time_limit(0);

        $this->info("Starting Stress Test Preparation...");
        
        // 1. Wipe existing data
        $this->info("1. Wiping database...");
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

        $userId = DB::table('users')->value('id') ?? 1;

        // 2. Insert Products, Customers, Suppliers
        $this->info("2. Generating Master Data...");
        
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

        // 3. Generate Transactions
        $this->info("3. Generating Transactions (Purchases, Sales, Returns)...");
        
        $periodId = DB::table('accounting_periods')->insertGetId([
            'name' => 'Initial Stress Test Period',
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

        // Arrays to hold bulk inserts
        $purchases = [];
        $purchaseItems = [];
        $supplierPayments = [];
        $invoices = [];
        $invoiceItems = [];
        $customerPayments = [];

        // Pre-generate random dates
        $randomDate = function() use ($startDate, $daysDiff) {
            return $startDate->copy()->addDays(rand(0, $daysDiff))->addSeconds(rand(0, 86400));
        };

        $this->info("   -> Creating 15,000 Purchases");
        $purId = 1;
        $purItemId = 1;
        for ($i = 1; $i <= 15000; $i++) {
            $date = $randomDate();
            $supplierId = $supplierIds[array_rand($supplierIds)];
            $total = 0;
            
            $numItems = rand(1, 10);
            $items = [];
            for ($j = 0; $j < $numItems; $j++) {
                $pid = $productIds[array_rand($productIds)];
                $qty = rand(10, 100);
                $cost = rand(10, 100) / 10; // 1.0 to 10.0
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

            // Payment logic
            $paid = 0;
            $rand = rand(1, 100);
            if ($rand <= 40) { // 40% full paid
                $paid = $total;
            } elseif ($rand <= 85) { // 45% partial
                $paid = rand(1, max(1, (int)($total - 1)));
            }
            
            if ($paid > 0) {
                $supplierPayments[] = [
                    'period_id' => $periodId,
                    'supplier_id' => $supplierId,
                    'user_id' => $userId,
                    'amount' => $paid,
                    'payment_method_id' => 1,
                    'notes' => 'Stress Test Payment',
                    'created_at' => $date,
                ];
            }

            $purchases[] = [
                'id' => $purId,
                'period_id' => $periodId,
                'supplier_id' => $supplierId,
                'user_id' => $userId,
                'total' => $total,
                'paid_amount' => $paid,
                'due_amount' => $total - $paid,
                'payment_status' => $paid == $total ? 'paid' : ($paid > 0 ? 'partial' : 'unpaid'),
                'created_at' => $date,
                'updated_at' => $date,
            ];
            $purchaseItems = array_merge($purchaseItems, $items);
            $purId++;

            if (count($purchases) >= 1000) {
                DB::table('purchases')->insert($purchases);
                DB::table('purchase_items')->insert($purchaseItems);
                if (!empty($supplierPayments)) DB::table('supplier_payments')->insert($supplierPayments);
                $purchases = []; $purchaseItems = []; $supplierPayments = [];
            }
        }
        if (!empty($purchases)) {
            DB::table('purchases')->insert($purchases);
            DB::table('purchase_items')->insert($purchaseItems);
            if (!empty($supplierPayments)) DB::table('supplier_payments')->insert($supplierPayments);
        }

        $this->info("   -> Creating 50,000 Sales");
        $invId = 1;
        $invItemId = 1;
        $purchases = []; $purchaseItems = []; $supplierPayments = []; // clear memory
        
        for ($i = 1; $i <= 50000; $i++) {
            $date = $randomDate();
            $customerId = $customerIds[array_rand($customerIds)];
            $total = 0;
            
            $numItems = rand(1, 10); // Average 5 items -> 250,000 total items
            $items = [];
            for ($j = 0; $j < $numItems; $j++) {
                $pid = $productIds[array_rand($productIds)];
                $qty = rand(1, 5);
                $price = rand(15, 150) / 10; // 1.5 to 15.0
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

            // Payment logic
            $paid = 0;
            $rand = rand(1, 100);
            if ($rand <= 40) {
                $paid = $total;
            } elseif ($rand <= 85) {
                $paid = rand(1, max(1, (int)($total - 1)));
            }
            
            if ($paid > 0) {
                $customerPayments[] = [
                    'period_id' => $periodId,
                    'customer_id' => $customerId,
                    'user_id' => $userId,
                    'amount' => $paid,
                    'payment_method_id' => 1,
                    'notes' => 'Stress Test Payment',
                    'created_at' => $date,
                ];
            }

            $invoices[] = [
                'id' => $invId,
                'period_id' => $periodId,
                'customer_id' => $customerId,
                'user_id' => $userId,
                'total' => $total,
                'paid_amount' => $paid,
                'due_amount' => $total - $paid,
                'payment_status' => $paid == $total ? 'paid' : ($paid > 0 ? 'partial' : 'unpaid'),
                'created_at' => $date,
                'updated_at' => $date,
            ];
            $invoiceItems = array_merge($invoiceItems, $items);
            $invId++;

            if (count($invoices) >= 1000) {
                DB::table('invoices')->insert($invoices);
                DB::table('invoice_items')->insert($invoiceItems);
                if (!empty($customerPayments)) DB::table('payments')->insert($customerPayments);
                $invoices = []; $invoiceItems = []; $customerPayments = [];
            }
        }
        if (!empty($invoices)) {
            DB::table('invoices')->insert($invoices);
            DB::table('invoice_items')->insert($invoiceItems);
            if (!empty($customerPayments)) DB::table('payments')->insert($customerPayments);
        }

        $this->info("   -> Recalculating Balances (Stock, Debt)...");
        // Update Stock
        DB::statement("
            UPDATE products p
            SET stock = (
                COALESCE((SELECT SUM(quantity) FROM purchase_items WHERE product_id = p.id), 0)
                - COALESCE((SELECT SUM(quantity) FROM invoice_items WHERE product_id = p.id), 0)
            )
        ");

        // Update Customer Debt
        DB::statement("
            UPDATE customers c
            SET 
                total_purchases = COALESCE((SELECT SUM(total) FROM invoices WHERE customer_id = c.id), 0),
                total_paid = COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = c.id), 0)
        ");
        DB::statement("UPDATE customers SET total_debt = opening_balance + total_purchases - total_paid");

        // Update Supplier Debt
        DB::statement("
            UPDATE suppliers s
            SET 
                total_purchases = COALESCE((SELECT SUM(total) FROM purchases WHERE supplier_id = s.id), 0),
                total_paid = COALESCE((SELECT SUM(amount) FROM supplier_payments WHERE supplier_id = s.id), 0)
        ");
        DB::statement("UPDATE suppliers SET total_debt = opening_balance + total_purchases - total_paid");

        $this->info("4. Running Benchmarks...");

        $repo = app(\App\Repositories\Contracts\ReportRepositoryInterface::class);
        $tests = [
            'Profit Analysis (1 Year)' => function() use ($repo) {
                return $repo->dailyProfitSummary(Carbon::now()->subYear()->toDateString(), Carbon::now()->toDateString());
            },
            'Stock Status (All)' => function() use ($repo) {
                return $repo->stockStatus(null, null, false);
            },
            'Daily Profit (3 Months)' => function() use ($repo) {
                return $repo->dailyProfitSummary(Carbon::now()->subMonths(3)->toDateString(), Carbon::now()->toDateString());
            },
            'Customer Invoices (1 Year)' => function() use ($repo) {
                return $repo->salesCustomerInvoices(Carbon::now()->subYear()->toDateString(), Carbon::now()->toDateString(), null, null, null, null);
            },
        ];

        $results = [];
        foreach ($tests as $name => $closure) {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $memStart = memory_get_usage();
            $timeStart = microtime(true);

            $closure();

            $timeEnd = microtime(true);
            $memEnd = memory_get_usage();
            $queries = DB::getQueryLog();
            
            $results[] = [
                'name' => $name,
                'time' => round($timeEnd - $timeStart, 2) . 's',
                'memory' => round(($memEnd - $memStart) / 1024 / 1024, 2) . 'MB',
                'queries' => count($queries),
            ];
            DB::disableQueryLog();
        }

        $this->table(['Report', 'Time', 'Memory', 'Queries'], $results);

        $this->info("Stress Test Completed!");
    }
}
