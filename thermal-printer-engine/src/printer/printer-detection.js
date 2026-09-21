const { execSync } = require('child_process');

/**
 * Retrieves the list of printers installed on Windows using PowerShell.
 * @returns {Array<{name: string, driver: string, port: string, status: string}>}
 */
function getInstalledPrinters() {
    try {
        const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | ForEach-Object { [PSCustomObject]@{ Name = $_.Name; DriverName = $_.DriverName; PortName = $_.PortName; PrinterPaperNames = $_.PrinterPaperNames } } | ConvertTo-Json -Depth 3"`;
        const stdout = execSync(psCommand, { encoding: 'utf8', timeout: 10000 });
        if (!stdout || !stdout.trim()) return [];

        const parsed = JSON.parse(stdout);
        const printers = Array.isArray(parsed) ? parsed : [parsed];

        return printers.map(p => ({
            name: p.Name || '',
            driver: p.DriverName || '',
            port: p.PortName || '',
            status: 'Ready',
            forms: Array.isArray(p.PrinterPaperNames) ? p.PrinterPaperNames : (p.PrinterPaperNames ? [p.PrinterPaperNames] : [])
        }));
    } catch (err) {
        console.warn("Failed to query printers via PowerShell Get-CimInstance:", err.message);
        return [];
    }
}

/**
 * Checks if a printer exists by exact or fuzzy name.
 * @param {string} targetPrinterName 
 * @returns {{found: boolean, matchedName: string|null, allPrinters: Array<any>}}
 */
function findPrinter(targetPrinterName) {
    const printers = getInstalledPrinters();
    if (!printers || printers.length === 0) {
        return { found: false, matchedName: null, allPrinters: [] };
    }

    // Exact match search
    const exact = printers.find(p => p.name.toLowerCase() === targetPrinterName.toLowerCase());
    if (exact) {
        return { found: true, matchedName: exact.name, printerInfo: exact, allPrinters: printers };
    }

    // Partial/Fuzzy match search (e.g. "POS-80", "XP-80", "80")
    const fuzzy = printers.find(p => 
        p.name.toLowerCase().includes(targetPrinterName.toLowerCase()) || 
        targetPrinterName.toLowerCase().includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes('80')
    );

    if (fuzzy) {
        return { found: true, matchedName: fuzzy.name, printerInfo: fuzzy, allPrinters: printers };
    }

    return { found: false, matchedName: null, allPrinters: printers };
}

module.exports = {
    getInstalledPrinters,
    findPrinter
};
