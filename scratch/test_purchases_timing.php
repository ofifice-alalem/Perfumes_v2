<?php

$t0 = microtime(true);
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

ob_start();
app(\App\Repositories\Contracts\ReportRepositoryInterface::class)->exportPurchasesSupplierInvoicesExcel(null, null, null, null, null, null, null);
$output = ob_get_clean();

$duration = microtime(true) - $t0;
echo "=== PURCHASES SUPPLIER INVOICES C++ EXPORTER BENCHMARK ===\n";
echo "Total Execution Time: " . round($duration, 3) . " seconds\n";
echo "Output Excel Size:   " . round(strlen($output) / 1024, 2) . " KB\n";
