const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { sampleInvoice, sampleMultiItemInvoice } = require('./src/invoice/invoice-data');
const { renderInvoiceCanvas } = require('./src/invoice/invoice-renderer');
const { encodePngToEscPosRaster } = require('./src/printer/escpos-encoder');
const { printRawBuffer } = require('./src/printer/printer-service');

function loadInvoiceData() {
    const fileArg = process.argv.find(arg => arg.startsWith('--file='));
    if (fileArg) {
        let filePath = fileArg.replace('--file=', '').replace(/^["']|["']$/g, '');
        if (!path.isAbsolute(filePath)) {
            filePath = path.resolve(process.cwd(), filePath);
        }
        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (filePath.includes('temp') || path.basename(filePath).startsWith('cli_')) {
                    try { fs.unlinkSync(filePath); } catch (e) {}
                }
                return data;
            } catch (e) {
                console.warn("Could not parse invoice JSON file:", e.message);
            }
        }
    }

    const useMulti = process.argv.includes('--multi');
    return useMulti ? sampleMultiItemInvoice : sampleInvoice;
}

async function main() {
    console.log("==============================================");
    console.log(" Sending POS-80 Invoice to Thermal Printer...");
    console.log("==============================================");

    const printerArg = process.argv.find(arg => arg.startsWith('--printer='));
    const printerName = printerArg 
        ? printerArg.replace('--printer=', '').replace(/^["']|["']$/g, '') 
        : (config.printer?.name || "XP-80");

    const invoice = loadInvoiceData();

    console.log(`Target Printer: "${printerName}"`);
    console.log(`Invoice Number: ${invoice.invoiceNumber}`);
    console.log(`Total Amount: ${invoice.total} دينار`);

    console.log("\n1. Rendering invoice to thermal canvas...");
    const canvas = await renderInvoiceCanvas(invoice, config);

    console.log("2. Encoding image to ESC/POS raster bitmap format...");
    const escposBuffer = await encodePngToEscPosRaster(canvas, {
        cutPaper: config.printer?.cutPaper !== false,
        feedLinesAfterPrint: config.printer?.feedLinesAfterPrint || 4
    });

    console.log("3. Transmitting raw bytes to Windows printer spooler...");
    const result = await printRawBuffer(printerName, escposBuffer);

    console.log("----------------------------------------------");
    console.log(`✔ SUCCESS: ${result.message}`);
    console.log("==============================================");
}

main().catch(err => {
    console.error("\n❌ PRINT ERROR:");
    console.error(err.message);
    console.error("==============================================");
    process.exit(1);
});
