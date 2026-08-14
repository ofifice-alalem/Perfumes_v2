<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$repo = app(\App\Repositories\Contracts\ReportRepositoryInterface::class);

ob_start();
$repo->exportSalesCustomerInvoicesExcel(null, null, null, null, null, null, null, null);
$output = ob_get_clean();

$headers = headers_list();
echo "=== EXPORT TIMING DIAGNOSTICS ===\n";
foreach ($headers as $h) {
    if (str_contains($h, 'X-Export-Engine') || str_contains($h, 'X-PHP-Query') || str_contains($h, 'X-CPP-Execution')) {
        echo $h . "\n";
    }
}
echo "Output Excel Size: " . strlen($output) . " bytes\n";
