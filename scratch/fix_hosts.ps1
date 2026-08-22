$hostsPath = 'C:\Windows\System32\drivers\etc\hosts'
$content = Get-Content $hostsPath -Raw

if ($content -notmatch '::1\s+tajori\.store') {
    $content += "`r`n::1          tajori.store`r`n::1          www.tajori.store`r`n"
    Set-Content -Path $hostsPath -Value $content -NoNewline
    Write-Output 'Added IPv6 mapping to hosts'
} else {
    Write-Output 'Already present'
}
