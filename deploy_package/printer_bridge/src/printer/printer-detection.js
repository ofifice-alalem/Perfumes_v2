const { execSync } = require('child_process');
const os = require('os');

/**
 * Retrieves the list of printers installed on the OS (Windows or Linux/CUPS).
 * @returns {Array<{name: string, driver: string, port: string, status: string}>}
 */
function getInstalledPrinters() {
    if (os.platform() === 'win32') {
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
    } else {
        // Linux / macOS (CUPS via lpstat)
        try {
            const stdout = execSync('lpstat -p -d', { encoding: 'utf8', timeout: 5000 });
            if (!stdout || !stdout.trim()) return [];

            const lines = stdout.split('\n');
            const printers = [];

            for (const line of lines) {
                const match = line.match(/^printer\s+([^\s]+)/i);
                if (match && match[1]) {
                    const name = match[1];
                    const isIdle = line.includes('idle');
                    const isDisabled = line.includes('disabled');
                    printers.push({
                        name: name,
                        driver: 'CUPS-RAW',
                        port: 'CUPS',
                        status: isDisabled ? 'Disabled' : (isIdle ? 'Ready' : 'Busy'),
                        forms: []
                    });
                }
            }

            return printers;
        } catch (err) {
            console.warn("Failed to query printers via lpstat:", err.message);
            return [];
        }
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

    // Exact match search (case-insensitive)
    const exact = printers.find(p => p.name.toLowerCase() === targetPrinterName.toLowerCase());
    if (exact) {
        return { found: true, matchedName: exact.name, printerInfo: exact, allPrinters: printers };
    }

    // Dynamic partial / fuzzy match
    const cleanTarget = targetPrinterName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanTarget) {
        const fuzzy = printers.find(p => {
            const cleanP = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanP.includes(cleanTarget) || cleanTarget.includes(cleanP);
        });

        if (fuzzy) {
            return { found: true, matchedName: fuzzy.name, printerInfo: fuzzy, allPrinters: printers };
        }
    }

    return { found: false, matchedName: null, allPrinters: printers };
}

module.exports = {
    getInstalledPrinters,
    findPrinter
};
