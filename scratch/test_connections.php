<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- Services Connectivity Test ---" . PHP_EOL;

// 1. MySQL
try {
    \DB::connection()->getPdo();
    $dbName = \DB::connection()->getDatabaseName();
    echo "[OK] MySQL connected successfully to database: $dbName" . PHP_EOL;
} catch (\Exception $e) {
    echo "[FAIL] MySQL Error: " . $e->getMessage() . PHP_EOL;
}

// 2. Redis
try {
    $redisStatus = \Illuminate\Support\Facades\Redis::ping();
    echo "[OK] Redis connected successfully (Ping: " . (is_string($redisStatus) ? $redisStatus : 'PONG') . ")" . PHP_EOL;
} catch (\Exception $e) {
    echo "[FAIL] Redis Error: " . $e->getMessage() . PHP_EOL;
}
