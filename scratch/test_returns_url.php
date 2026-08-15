<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

ob_start();
try {
    app(\App\Repositories\Contracts\ReportRepositoryInterface::class)->exportReturnsExcel(
        '2026-01-01', // dateFrom
        '2026-11-01', // dateTo
        null, // userId
        null, // customerId
        null, // supplierId
        null, // categoryId
        null, // filterProductIds
        null  // searchName
    );
    $out = ob_get_clean();
    file_put_contents(__DIR__ . '/returns_result.xlsx', $out);
    echo "SUCCESS! Generated Excel file size: " . filesize(__DIR__ . '/returns_result.xlsx') . " bytes\n";
} catch (\Throwable $e) {
    ob_end_clean();
    echo "EXCEPTIONAL ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
