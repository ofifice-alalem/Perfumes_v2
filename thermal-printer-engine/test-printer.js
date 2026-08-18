const { createCanvas } = require('@napi-rs/canvas');
const config = require('./config.json');
const { fixArabic } = require('./src/invoice/arabic-helper');
const { encodePngToEscPosRaster } = require('./src/printer/escpos-encoder');
const { printRawBuffer } = require('./src/printer/printer-service');

async function main() {
    console.log("==============================================");
    console.log(" Running POS-80 Thermal Printer Test Page...");
    console.log("==============================================");

    const printerName = config.printer?.name || "XP-80";
    const width = config.printer?.printableWidthDots || 576;
    const height = 350;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    let y = 20;

    // Title
    ctx.font = 'bold 26px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic(config.store?.name || "طيب التاجوري"), width / 2, y);
    y += 40;

    ctx.font = 'bold 22px "Segoe UI", Arial';
    ctx.fillText(fixArabic("اختبار الطابعة الحرارية POS-80"), width / 2, y);
    y += 35;

    // Divider
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(width - 20, y);
    ctx.lineWidth = 2;
    ctx.stroke();
    y += 15;

    // Diagnostics info
    ctx.font = '16px "Segoe UI", Arial';
    ctx.textAlign = 'right';
    ctx.fillText(fixArabic(`اسم الطابعة: ${printerName}`), width - 30, y);
    y += 26;

    ctx.fillText(fixArabic(`عرض الورق: ${config.printer?.paperWidthMm || 80}mm (${width}px)`), width - 30, y);
    y += 26;

    ctx.fillText(fixArabic(`تاريخ الاختبار: ${new Date().toLocaleString()}`), width - 30, y);
    y += 35;

    // Alignment test pattern
    ctx.strokeRect(20, y, width - 40, 45);
    ctx.font = 'bold 18px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic("✔ الاتصال والطباعة يعملان بنجاح"), width / 2, y + 10);
    y += 65;

    const pngBuffer = canvas.toBuffer('image/png');
    const escposBuffer = await encodePngToEscPosRaster(pngBuffer, { cutPaper: true, feedLinesAfterPrint: 4 });

    const result = await printRawBuffer(printerName, escposBuffer);

    console.log("----------------------------------------------");
    console.log(`✔ SUCCESS: ${result.message}`);
    console.log("==============================================");
}

main().catch(err => {
    console.error("\n❌ TEST PRINTER ERROR:");
    console.error(err.message);
    console.error("==============================================");
    process.exit(1);
});
