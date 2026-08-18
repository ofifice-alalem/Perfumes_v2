const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findPrinter } = require('./printer-detection');

/**
 * Sends a raw binary ESC/POS byte buffer directly to a Windows printer spooler.
 * 
 * @param {string} printerName Target printer name (e.g. "POS-80", "XP-80")
 * @param {Buffer} rawBuffer Binary ESC/POS buffer
 * @returns {Promise<{success: boolean, message: string, printerUsed: string}>}
 */
async function printRawBuffer(printerName, rawBuffer) {
    // 1. Detect printer
    const detection = findPrinter(printerName);

    if (!detection.found) {
        const availableNames = detection.allPrinters.map(p => `  - "${p.name}" (${p.driver}, ${p.port})`).join('\n');
        const errorMessage = `Printer "${printerName}" was not found.\n\nAvailable Printers in Windows:\n${availableNames || '  None found'}`;
        throw new Error(errorMessage);
    }

    const actualPrinterName = detection.matchedName;
    console.log(`Printing RAW job to printer: "${actualPrinterName}"...`);

    // 2. Save raw buffer to temporary binary file
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `print_job_${Date.now()}.bin`);
    fs.writeFileSync(tempFilePath, rawBuffer);

    try {
        // 3. Execute Windows RAW print via ultra-fast native compiled raw-print.exe
        const exePath = path.join(__dirname, '../../bin/raw-print.exe');
        let output = '';

        if (fs.existsSync(exePath)) {
            const command = `"${exePath}" "${actualPrinterName}" "${tempFilePath}"`;
            output = execSync(command, { encoding: 'utf8', timeout: 5000 });
        } else {
            // Fallback to PowerShell script
            const psScriptPath = path.join(__dirname, 'raw-print.ps1');
            createRawPrintPs1(psScriptPath);
            const escapedPath = tempFilePath.replace(/'/g, "''");
            const escapedPrinter = actualPrinterName.replace(/'/g, "''");
            const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "& '${psScriptPath}' -PrinterName '${escapedPrinter}' -FilePath '${escapedPath}'"`;
            output = execSync(command, { encoding: 'utf8', timeout: 15000 });
        }
        
        // Clean up temporary binary file
        if (fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }

        if (output && output.includes('SUCCESS')) {
            return {
                success: true,
                message: `Invoice printed successfully to "${actualPrinterName}".`,
                printerUsed: actualPrinterName
            };
        } else {
            throw new Error(`Printer returned output: ${output.trim()}`);
        }
    } catch (err) {
        // Cleanup temp file on error
        if (fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
        throw new Error(`Failed to print to "${actualPrinterName}": ${err.message}`);
    }
}

/**
 * Creates the PowerShell helper script for sending raw bytes via winspool.drv
 */
function createRawPrintPs1(targetPath) {
    const psContent = `
param(
    [string]$PrinterName,
    [string]$FilePath
)

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
        Int32 dwWritten = 0;
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;

        di.pDocName = "Thermal Receipt RAW Print";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
"@

Add-Type -TypeDefinition $code

if (-not (Test-Path $FilePath)) {
    Write-Error "Binary file not found: $FilePath"
    exit 1
}

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$result = [RawPrinterHelper]::SendBytesToPrinter($PrinterName, $bytes)

if ($result) {
    Write-Host "SUCCESS"
} else {
    Write-Error "Failed to send bytes to printer spooler."
    exit 1
}
`;

    fs.writeFileSync(targetPath, psContent.trim(), 'utf8');
}

module.exports = {
    printRawBuffer
};
