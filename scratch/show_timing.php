<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$t0 = microtime(true);
$repo = app(\App\Repositories\Contracts\ReportRepositoryInterface::class);

$t1 = microtime(true);
$data = $repo->salesCustomerInvoices(null, null, null, null, null, null, null, null, null);
$t2 = microtime(true);

$tmpJson = tempnam(sys_get_temp_dir(), 'cpp_exp_') . '.json';
$tmpXlsx = tempnam(sys_get_temp_dir(), 'cpp_exp_') . '.xlsx';

file_put_contents($tmpJson, json_encode([
    'date_from' => 'البداية',
    'date_to'   => date('Y-m-d'),
    'entries'   => $data,
], JSON_UNESCAPED_UNICODE));

$t3 = microtime(true);
exec('"' . base_path('bin/export_xlsx.exe') . '" "' . $tmpXlsx . '" "' . $tmpJson . '"', $out, $code);
$t4 = microtime(true);

echo "=== DIAGNOSTIC TIMING BREAKDOWN ===\n";
echo "1. PHP DB Query & Hydration Time: " . round($t2 - $t1, 3) . " seconds\n";
echo "2. PHP JSON Encoding Time:        " . round($t3 - $t2, 3) . " seconds\n";
echo "3. C++ Binary XLSX Generation:   " . round($t4 - $t3, 3) . " seconds\n";
echo "Total Execution Time:             " . round($t4 - $t0, 3) . " seconds\n";

@unlink($tmpJson);
@unlink($tmpXlsx);
