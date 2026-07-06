<?php
$file = '/home/hammam/Desktop/work/Perfumes_v2/app/Repositories/ReportRepository.php';
$content = file_get_contents($file);

// Use simple string replacement for all the sizes
$content = str_replace("'size' => 10", "'size' => 15", $content);
$content = str_replace("'size' => 11", "'size' => 15", $content);
$content = str_replace("'size' => 12", "'size' => 15", $content);
$content = str_replace("'size' => 9", "'size' => 13", $content);

$result = file_put_contents($file, $content);
if ($result !== false) {
    echo "Success: replaced sizes in $file\n";
} else {
    echo "Error: failed to write to $file\n";
}
