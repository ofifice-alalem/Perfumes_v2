[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$url = "https://github.com/madler/zlib/archive/refs/tags/v1.3.1.zip"
$zipPath = "$env:TEMP\zlib.zip"
$extractDir = "$env:TEMP\zlib_extracted"

Write-Host "Downloading zlib v1.3.1..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting zlib..."
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$targetDir = "c:\Users\alale\OneDrive\Desktop\work\Perfumes_v2\bin\zlib"
if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$srcRoot = "$extractDir\zlib-1.3.1"
Copy-Item -Recurse -Force "$srcRoot\*" "$targetDir\"

Write-Host "zlib sources ready at: $targetDir"
