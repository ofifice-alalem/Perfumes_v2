<?php

$start = microtime(true);
$outputFile = __DIR__ . '/cpp_50k_benchmark.xlsx';

$cmd = '"' . __DIR__ . '/../bin/export_xlsx.exe" "' . $outputFile . '"';
exec($cmd, $out, $code);

$duration = microtime(true) - $start;
$sizeMb = file_exists($outputFile) ? round(filesize($outputFile) / 1024 / 1024, 2) : 0;

echo "=== C++ NATIVE EXPORTER BENCHMARK ===\n";
echo "Exit Code: {$code}\n";
echo "Execution Time: " . round($duration, 3) . " seconds\n";
echo "Generated File Size: {$sizeMb} MB\n";
echo "Output Log: " . implode("\n", $out) . "\n";
