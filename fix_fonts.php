<?php
$file = '/home/hammam/Desktop/work/Perfumes_v2/app/Repositories/ReportRepository.php';
$content = file_get_contents($file);

// Replace font sizes 10, 11, 12 with 15
$content = preg_replace("/'size'\s*=>\s*10\b/", "'size' => 15", $content);
$content = preg_replace("/'size'\s*=>\s*11\b/", "'size' => 15", $content);
$content = preg_replace("/'size'\s*=>\s*12\b/", "'size' => 15", $content);

// Change size 9 to 13
$content = preg_replace("/'size'\s*=>\s*9\b/", "'size' => 13", $content);

file_put_contents($file, $content);
echo "Done";
