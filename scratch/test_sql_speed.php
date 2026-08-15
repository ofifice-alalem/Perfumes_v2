<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$t0 = microtime(true);
$pdo = \Illuminate\Support\Facades\DB::connection()->getPdo();

$dfStr = '2026-01-01 00:00:00';
$dtStr = '2026-11-01 23:59:59';

$sql = "SELECT COALESCE(c.name, 'عميل عام'), i.id, DATE_FORMAT(i.created_at, '%Y-%m-%d'), i.total, COUNT(ii.id) AS item_count, COALESCE(p.name, 'منتج'), COALESCE(sz.label, '-'), SUM(ii.quantity), ii.unit_price, SUM(ii.line_total) FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id LEFT JOIN invoice_items ii ON ii.invoice_id = i.id LEFT JOIN products p ON p.id = ii.product_id LEFT JOIN sizes sz ON sz.id = ii.size_id WHERE i.deleted_at IS NULL AND i.created_at >= '{$dfStr}' AND i.created_at <= '{$dtStr}' GROUP BY i.id, c.name, i.created_at, i.total, ii.product_id, ii.size_id, ii.unit_price, p.name, sz.label ORDER BY c.name ASC, i.id DESC";

echo "Executing Direct PDO MySQL SQL Query...\n";
$stmt = $pdo->query($sql);
$t1 = microtime(true);

echo "Query execution took: " . number_format(($t1 - $t0), 3) . " seconds.\n";

$t2 = microtime(true);
$storageDir = storage_path('app');
$tmpTsv  = $storageDir . DIRECTORY_SEPARATOR . 'bench_db_' . uniqid() . '.tsv';
$tmpXlsx = $storageDir . DIRECTORY_SEPARATOR . 'bench_exp_' . uniqid() . '.xlsx';

$f = fopen($tmpTsv, 'w');
fwrite($f, "#META\t2026-01-01\t2026-11-01\tالكل\t" . now()->format('Y-m-d H:i') . "\tتقرير فواتير المبيعات حسب العملاء\tالعميل\tinvoices_grouped\n");

$rowCount = 0;
while ($row = $stmt->fetch(\PDO::FETCH_NUM)) {
    fwrite($f, implode("\t", $row) . "\n");
    $rowCount++;
}
fclose($f);
$t3 = microtime(true);

echo "Writing TSV took: " . number_format(($t3 - $t2), 3) . " seconds. Total rows: " . $rowCount . "\n";

$t4 = microtime(true);
$cppExe = base_path('bin' . DIRECTORY_SEPARATOR . 'export_xlsx.exe');
$cmdCpp = '"' . $cppExe . '" "' . $tmpXlsx . '" "' . $tmpTsv . '"';
exec($cmdCpp, $out, $code);
$t5 = microtime(true);

echo "C++ binary execution took: " . number_format(($t5 - $t4), 3) . " seconds.\n";

@unlink($tmpTsv);
@unlink($tmpXlsx);

echo "=== TOTAL PIPELINE TIME: " . number_format(($t5 - $t0), 3) . " SECONDS ===\n";
