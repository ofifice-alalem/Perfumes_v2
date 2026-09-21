const { execSync } = require('child_process');

try {
    const script = `
        $cfg = Get-PrintConfiguration -PrinterName 'Xprinter XP-365B'
        $xml = [xml]$cfg.PrintTicketXML
        $media = $xml.PrintTicket.Feature | Where-Object { $_.name -like '*PageMediaSize*' }
        $media | ConvertTo-Json -Depth 5
    `;
    const res = execSync(`powershell -NoProfile -Command "${script.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf8' });
    console.log("Media in PrintTicket:", res);
} catch (e) {
    console.error(e.message);
}
