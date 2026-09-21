const { execSync } = require('child_process');

try {
    const script = `Get-CimInstance Win32_Printer | ForEach-Object { [PSCustomObject]@{ Name = $_.Name; Forms = $_.PrinterPaperNames } } | ConvertTo-Json -Depth 3`;
    const res = execSync(`powershell -NoProfile -Command "${script}"`, { encoding: 'utf8' });
    console.log(res);
} catch (e) {
    console.error(e.message);
}
