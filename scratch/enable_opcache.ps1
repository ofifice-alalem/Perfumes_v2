$iniPath = 'C:\php-8.4.24\php.ini'
$content = Get-Content $iniPath -Raw

$content = $content -replace ';zend_extension=opcache', 'zend_extension=opcache'
$content = $content -replace ';opcache.enable=1', 'opcache.enable=1'
$content = $content -replace ';opcache.enable_cli=0', 'opcache.enable_cli=1'
$content = $content -replace ';opcache.memory_consumption=128', 'opcache.memory_consumption=256'
$content = $content -replace ';opcache.interned_strings_buffer=8', 'opcache.interned_strings_buffer=32'
$content = $content -replace ';opcache.max_accelerated_files=10000', 'opcache.max_accelerated_files=30000'
$content = $content -replace ';opcache.validate_timestamps=1', 'opcache.validate_timestamps=1'
$content = $content -replace ';opcache.revalidate_freq=2', 'opcache.revalidate_freq=2'
$content = $content -replace ';opcache.save_comments=1', 'opcache.save_comments=1'

if ($content -notmatch 'opcache.jit=tracing') {
    $content += "`r`n`r`n[opcache_jit]`r`nopcache.jit_buffer_size=128M`r`nopcache.jit=tracing`r`n"
}

Set-Content -Path $iniPath -Value $content -NoNewline
Write-Output "php.ini updated successfully"
