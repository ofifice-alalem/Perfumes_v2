const config = require('./config.json');
const { sampleInvoice, sampleMultiItemInvoice } = require('./src/invoice/invoice-data');
const { renderInvoiceCanvas } = require('./src/invoice/invoice-renderer');
const { encodePngToEscPosRaster } = require('./src/printer/escpos-encoder');
const { printRawBuffer } = require('./src/printer/printer-service');

async function main() {
    console.log("==============================================");
    console.log(" Sending POS-80 Invoice to Thermal Printer...");
    console.log("==============================================");

    const printerName = config.printer?.name || "XP-80";
    const useMulti = process.argv.includes('--multi');
    const invoice = useMulti ? sampleMultiItemInvoice : sampleInvoice;

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
