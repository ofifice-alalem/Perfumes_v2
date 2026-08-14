[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$url = "https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp"
$targetDir = "c:\Users\alale\OneDrive\Desktop\work\Perfumes_v2\bin\nlohmann"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }

Write-Host "Downloading nlohmann/json.hpp..."
Invoke-WebRequest -Uri $url -OutFile "$targetDir\json.hpp"
Write-Host "nlohmann/json.hpp ready!"
