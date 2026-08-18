const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { sampleInvoice, sampleMultiItemInvoice } = require('./src/invoice/invoice-data');
const { renderInvoiceCanvas } = require('./src/invoice/invoice-renderer');

async function main() {
    console.log("==============================================");
    console.log(" Generating POS-80 Invoice Preview Image...");
    console.log("==============================================");

    // Support --multi flag to test multi-item invoice preview
    const useMulti = process.argv.includes('--multi');
    const invoice = useMulti ? sampleMultiItemInvoice : sampleInvoice;

    console.log(`Invoice Number: ${invoice.invoiceNumber}`);
    console.log(`Cashier: ${invoice.cashier}`);
    console.log(`Items Count: ${invoice.items.length}`);

    // Render Canvas PNG Buffer
    const canvas = await renderInvoiceCanvas(invoice, config);
    const pngBuffer = canvas.toBuffer ? canvas.toBuffer('image/png') : canvas;

    // Output Directory
    const outputDir = path.resolve(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const previewPath = path.join(outputDir, 'invoice-preview.png');
    fs.writeFileSync(previewPath, pngBuffer);

    console.log("----------------------------------------------");
    console.log(`✔ Preview saved successfully to:`);
    console.log(`  ${previewPath}`);
    console.log("==============================================");
}

main().catch(err => {
    console.error("❌ Preview error:", err.message);
    process.exit(1);
});
