[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$url = "https://github.com/jmcnamara/libxlsxwriter/archive/refs/tags/v1.1.9.zip"
$zipPath = "$env:TEMP\libxlsxwriter.zip"
$extractDir = "$env:TEMP\libxlsxwriter_extracted"

Write-Host "Downloading libxlsxwriter v1.1.9..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting libxlsxwriter..."
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$targetDir = "c:\Users\alale\OneDrive\Desktop\work\Perfumes_v2\bin\libxlsxwriter"
if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }

New-Item -ItemType Directory -Force -Path "$targetDir\include" | Out-Null
New-Item -ItemType Directory -Force -Path "$targetDir\src" | Out-Null

$srcRoot = "$extractDir\libxlsxwriter-1.1.9"

Copy-Item -Recurse -Force "$srcRoot\include\*" "$targetDir\include\"
Copy-Item -Recurse -Force "$srcRoot\src\*" "$targetDir\src\"
Copy-Item -Recurse -Force "$srcRoot\third_party\minizip" "$targetDir\third_party\minizip"
Copy-Item -Recurse -Force "$srcRoot\third_party\tmpfileplus" "$targetDir\third_party\tmpfileplus"
Copy-Item -Recurse -Force "$srcRoot\third_party\md5" "$targetDir\third_party\md5"

Write-Host "libxlsxwriter sources ready at: $targetDir"
