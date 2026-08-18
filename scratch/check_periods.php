<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$totalInvoices = \App\Models\Invoice::count();
$nullCount = \App\Models\Invoice::whereNull('period_id')->count();
$validCount = \App\Models\Invoice::whereNotNull('period_id')->count();

echo "==============================================" . PHP_EOL;
echo "📊 نتيجة فحص حقل period_id في جدول الفواتير:" . PHP_EOL;
echo "==============================================" . PHP_EOL;
echo "إجمالي عدد الفواتير: " . $totalInvoices . PHP_EOL;
echo "الفواتير التي تحتوي على period_id (صحيحة): " . $validCount . PHP_EOL;
echo "الفواتير التي فيها period_id فارغ (NULL): " . $nullCount . PHP_EOL;
echo "----------------------------------------------" . PHP_EOL;
echo "📋 فحص آخر 10 فواتير:" . PHP_EOL;

$last10 = \App\Models\Invoice::latest('id')->take(10)->get();

foreach ($last10 as $inv) {
    $status = $inv->period_id !== null ? "✅ period_id = {$inv->period_id}" : "❌ period_id = NULL";
    echo "فاتورة #{$inv->id} | التاريخ: {$inv->created_at} | المبلغ: {$inv->total} د.ل | {$status}" . PHP_EOL;
}

echo "==============================================" . PHP_EOL;
