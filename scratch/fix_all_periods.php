<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

ob_implicit_flush(true);

$openPeriod = DB::table('accounting_periods')->where('status', 'open')->first();
$periodId = $openPeriod ? $openPeriod->id : 1;

echo "==========================================================" . PHP_EOL;
echo "🚀 بدء تحديث period_id = {$periodId} في جميع جداول قاعدة البيانات..." . PHP_EOL;
echo "==========================================================" . PHP_EOL;

// Get all tables in current database that have 'period_id' column
$tables = DB::select("
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND COLUMN_NAME = 'period_id'
");

$summary = [];

foreach ($tables as $t) {
    $tableName = $t->TABLE_NAME;
    $nullBefore = DB::table($tableName)->whereNull('period_id')->count();
    
    if ($nullBefore > 0) {
        $updated = DB::table($tableName)->whereNull('period_id')->update(['period_id' => $periodId]);
        $summary[] = [
            'table' => $tableName,
            'updated' => $updated
        ];
        echo "✅ جدول [{$tableName}]: تم تحديث {$updated} سجل كان يحتوي على NULL إلى period_id = {$periodId}" . PHP_EOL;
    } else {
        echo "ℹ️  جدول [{$tableName}]: لا يوجد به أي سجلات فارغة (0 NULL)" . PHP_EOL;
    }
}

echo "----------------------------------------------------------" . PHP_EOL;
echo "✨ اكتمل التحديث بنجاح لكافة الجداول!" . PHP_EOL;
echo "==========================================================" . PHP_EOL;
