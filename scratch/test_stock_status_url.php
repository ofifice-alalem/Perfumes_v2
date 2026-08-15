<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

ob_start();
try {
    app(\App\Repositories\Contracts\ReportRepositoryInterface::class)->exportStockStatusExcel(
        null, // categoryId
        null, // sellingType
        false, // lowStockOnly
        true, // showSold
        true, // showWasted
        true, // showPurchased
        '2026-01-01', // dateFrom
        '2026-11-01', // dateTo
        false, // compactView
        null, // filterProductIds
        null  // searchName
    );
    $out = ob_get_clean();
    file_put_contents(__DIR__ . '/stock_status_result.xlsx', $out);
    echo "SUCCESS! Generated Excel file size: " . filesize(__DIR__ . '/stock_status_result.xlsx') . " bytes\n";
} catch (\Throwable $e) {
    ob_end_clean();
    echo "EXCEPTIONAL ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
