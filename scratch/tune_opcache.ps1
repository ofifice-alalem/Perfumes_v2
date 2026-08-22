$iniPath = 'C:\php-8.4.24\php.ini'
$content = Get-Content $iniPath -Raw

$content = $content -replace 'opcache.revalidate_freq=2', 'opcache.revalidate_freq=60'

Set-Content -Path $iniPath -Value $content -NoNewline
Write-Output "php.ini revalidate_freq updated"
