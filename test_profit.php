<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$startOfMonth = now()->startOfMonth()->toDateTimeString();
$endOfMonth = now()->endOfMonth()->toDateTimeString();

$stockStatus = app(\App\Repositories\Contracts\ReportRepositoryInterface::class)->stockStatus(null, null, false, true, false, true, $startOfMonth, $endOfMonth);

$totalProfit = 0;
foreach ($stockStatus as $p) {
    if ($p['profit'] !== null) {
        $totalProfit += $p['profit'];
    }
}
echo "Total Profit: " . $totalProfit . "\n";
