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
                if (filePath.includes('temp') || path.basename(filePath).startsWith('label_') || path.basename(filePath).startsWith('batch_labels_')) {
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

    const labelsList = Array.isArray(labelData.labels) && labelData.labels.length > 0
        ? labelData.labels
        : [labelData];

    console.log(`Target Printer: "${printerName}"`);
    console.log(`Labels Count: ${labelsList.length}`);

    console.log("\n1. Rendering label(s) to 203 DPI canvas with Tajawal font...");
    const buffers = [];
    for (let i = 0; i < labelsList.length; i++) {
        const item = labelsList[i];
        const canvas = await renderLabelCanvas(item);
        const protocol = item.protocol || 'tspl';
        if (protocol === 'escpos') {
            buffers.push(encodeCanvasToEscPos(canvas, item));
        } else {
            buffers.push(encodeCanvasToTspl(canvas, item));
        }
    }

    console.log("2. Transmitting raw bytes to Windows printer spooler...");
    const combinedBuffer = Buffer.concat(buffers);
    const result = await printRawBuffer(printerName, combinedBuffer);

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
