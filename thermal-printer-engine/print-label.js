const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { renderLabelCanvas } = require('./src/label/label-renderer');
const { encodeCanvasToTspl, encodeCanvasToEscPos } = require('./src/label/label-encoder');
const { printRawBuffer } = require('./src/printer/printer-service');

function loadLabelData() {
    const fileArg = process.argv.find(arg => arg.startsWith('--file='));
    if (fileArg) {
        let filePath = fileArg.replace('--file=', '').replace(/^["']|["']$/g, '');
        if (!path.isAbsolute(filePath)) {
            filePath = path.resolve(process.cwd(), filePath);
        }
        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (filePath.includes('temp') || path.basename(filePath).startsWith('label_')) {
                    try { fs.unlinkSync(filePath); } catch (e) {}
                }
                return data;
            } catch (e) {
                console.warn("Could not parse label JSON file:", e.message);
            }
        }
    }

    return {
        widthMm: 50,
        heightMm: 25,
        rotation: 0,
        tab: 'ean13',
        productName: 'عطر تاجوري الفاخر',
        price: '145.00 د.ل',
        code: '240000669027',
        showName: true,
        showPrice: true,
        showCodeText: true,
        copies: 1
    };
}

async function main() {
    console.log("==============================================");
    console.log(" Sending Barcode/QR Label to Thermal Printer...");
    console.log("==============================================");

    const labelData = loadLabelData();

    const printerArg = process.argv.find(arg => arg.startsWith('--printer='));
    const printerName = printerArg 
        ? printerArg.replace('--printer=', '').replace(/^["']|["']$/g, '') 
        : (labelData.printerName || config.labelPrinter?.name || config.printer?.name || "XP-365B");

    console.log(`Target Printer: "${printerName}"`);
    console.log(`Dimensions: ${labelData.widthMm}x${labelData.heightMm} mm`);
    console.log(`Product: ${labelData.productName}`);

    console.log("\n1. Rendering label to 203 DPI canvas with Tajawal font...");
    const canvas = await renderLabelCanvas(labelData);

    const protocol = labelData.protocol || 'tspl';
    let rawBuffer;

    if (protocol === 'escpos') {
        console.log("2. Encoding image to ESC/POS raster format...");
        rawBuffer = encodeCanvasToEscPos(canvas, labelData);
    } else {
        console.log("2. Encoding image to TSPL native label format with auto SIZE & GAP...");
        rawBuffer = encodeCanvasToTspl(canvas, labelData);
    }

    console.log("3. Transmitting raw bytes to Windows printer spooler...");
    const result = await printRawBuffer(printerName, rawBuffer);

    console.log("----------------------------------------------");
    console.log(`✔ SUCCESS: ${result.message}`);
    console.log("==============================================");
}

main().catch(err => {
    console.error("\n❌ LABEL PRINT ERROR:");
    console.error(err.message);
    console.error("==============================================");
    process.exit(1);
});
