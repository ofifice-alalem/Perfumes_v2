<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$today     = now()->toDateString();
$monthStart = now()->startOfMonth()->toDateString();

$q = \App\Models\Invoice::selectRaw('DATE(created_at) as day, SUM(total) as sales')
            ->whereBetween('created_at', [$monthStart . ' 00:00:00', $today . ' 23:59:59'])
            ->groupBy('day')
            ->orderBy('day');

echo $q->toSql();
echo "\nBindings:\n";
print_r($q->getBindings());
