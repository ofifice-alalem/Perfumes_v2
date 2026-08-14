<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$t0 = microtime(true);

$pdo = DB::connection()->getPdo();
$sql = "SELECT COALESCE(c.name, 'عميل عام'), i.id, DATE_FORMAT(i.created_at, '%Y-%m-%d'), i.total, COALESCE(p.name, 'منتج'), COALESCE(sz.label, '-'), ii.quantity, ii.unit_price, ii.line_total FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id LEFT JOIN invoice_items ii ON ii.invoice_id = i.id LEFT JOIN products p ON p.id = ii.product_id LEFT JOIN sizes sz ON sz.id = ii.size_id WHERE i.deleted_at IS NULL ORDER BY c.name ASC, i.id DESC, ii.id ASC";

$storageDir = storage_path('app');
if (!file_exists($storageDir)) { mkdir($storageDir, 0777, true); }

$tmpTsv  = $storageDir . DIRECTORY_SEPARATOR . 'cpp_db_' . uniqid() . '.tsv';
$tmpXlsx = $storageDir . DIRECTORY_SEPARATOR . 'cpp_exp_' . uniqid() . '.xlsx';

$f = fopen($tmpTsv, 'w');
$stmt = $pdo->query($sql);

while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
    fwrite($f, implode("\t", $row) . "\n");
}
fclose($f);

$tPdo = microtime(true) - $t0;

$cppExe = base_path('bin' . DIRECTORY_SEPARATOR . 'export_xlsx.exe');
$cmdCpp = '"' . $cppExe . '" "' . $tmpXlsx . '" "null" "null" "' . $tmpTsv . '"';
exec($cmdCpp, $out, $code);

$tCpp = microtime(true) - $t0 - $tPdo;

echo "=== UNBUFFERED PDO STREAM BENCHMARK ===\n";
echo "Exit Code: {$code}\n";
echo "1. PDO Unbuffered Query & TSV Write Time: " . round($tPdo, 3) . " seconds\n";
echo "2. C++ Binary XLSX Generation Time:       " . round($tCpp, 3) . " seconds\n";
echo "Total Time:                               " . round($tPdo + $tCpp, 3) . " seconds\n";
echo "TSV Size:  " . round(filesize($tmpTsv) / 1024, 2) . " KB\n";
if (file_exists($tmpXlsx)) {
    echo "XLSX Size: " . round(filesize($tmpXlsx) / 1024, 2) . " KB\n";
} else {
    echo "XLSX file NOT created!\n";
}

@unlink($tmpTsv);
@unlink($tmpXlsx);
