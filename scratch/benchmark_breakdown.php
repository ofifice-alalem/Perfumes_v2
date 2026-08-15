<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$t0 = microtime(true);
echo "=== BENCHMARK BREAKDOWN ===\n";

// 1. Measure DB Query Time
$t1 = microtime(true);
$repo = app(\App\Repositories\Contracts\ReportRepositoryInterface::class);

echo "1. Fetching DB Data (salesCustomerInvoices)... ";
$data = $repo->salesCustomerInvoices('2026-01-01', '2026-11-01', null, null, null, null);
$t2 = microtime(true);
echo number_format(($t2 - $t1), 3) . " seconds. Customers returned: " . count($data) . "\n";

// 2. Measure TSV Generation
echo "2. Formatting TSV Data in PHP... ";
$t3 = microtime(true);
$storageDir = storage_path('app');
$tmpTsv  = $storageDir . DIRECTORY_SEPARATOR . 'bench_db_' . uniqid() . '.tsv';
$tmpXlsx = $storageDir . DIRECTORY_SEPARATOR . 'bench_exp_' . uniqid() . '.xlsx';

$f = fopen($tmpTsv, 'w');
fwrite($f, "#META\t2026-01-01\t2026-11-01\tالكل\t" . now()->format('Y-m-d H:i') . "\tتقرير فواتير المبيعات حسب العملاء\tالعميل\tinvoices_grouped\n");

$lineCount = 0;
foreach ($data as $cust) {
    $custName = $cust['customer_name'] ?? 'عميل نقد';
    foreach ($cust['invoices'] as $inv) {
        foreach ($inv['items'] as $item) {
            $line = $custName . "\t" .
                    $inv['invoice_id'] . "\t" .
                    $inv['invoice_date'] . "\t" .
                    $inv['invoice_total'] . "\t" .
                    $inv['item_count'] . "\t" .
                    $item['name'] . "\t" .
                    ($item['size_label'] ?? '') . "\t" .
                    $item['quantity'] . "\t" .
                    $item['unit_price'] . "\t" .
                    $item['line_total'] . "\n";
            fwrite($f, $line);
            $lineCount++;
        }
    }
}
fclose($f);
$t4 = microtime(true);
echo number_format(($t4 - $t3), 3) . " seconds. Total TSV lines: " . $lineCount . " (TSV size: " . number_format(filesize($tmpTsv) / 1024, 2) . " KB)\n";

// 3. Measure C++ Execution
echo "3. Executing C++ Engine (export_xlsx.exe)... ";
$t5 = microtime(true);
$cppExe = base_path('bin' . DIRECTORY_SEPARATOR . 'export_xlsx.exe');
$cmdCpp = '"' . $cppExe . '" "' . $tmpXlsx . '" "' . $tmpTsv . '"';
exec($cmdCpp, $out, $code);
$t6 = microtime(true);
echo number_format(($t6 - $t5), 3) . " seconds. Generated XLSX size: " . number_format(filesize($tmpXlsx) / 1024, 2) . " KB\n";

@unlink($tmpTsv);
@unlink($tmpXlsx);

echo "=== TOTAL TIME: " . number_format(($t6 - $t0), 3) . " SECONDS ===\n";
