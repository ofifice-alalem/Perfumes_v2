/**
 * تشفير الـ Canvas إلى أوامر TSPL الثنائية المخصصة لطابعات الباركود (Xprinter / Zebra / TSC)
 * تقوم بإرسال أمر SIZE الحقيقي و GAP آلياً إلى الفيرموير الداخلي للطابعة
 * مما يحل مشكلة قيود متصفح Chrome وحجم الورق نهائياً!
 * 
 * @param {Canvas} canvas كائن الكانفاس المرسوم
 * @param {Object} options خيارات الحجم والنسخ
 * @returns {Buffer} أوامر ثنائية جاهزة للـ Windows Spooler
 */
function encodeCanvasToTspl(canvas, options = {}) {
    const widthMm = Number(options.widthMm) || 50;
    const heightMm = Number(options.heightMm) || 25;
    const copies = Math.max(1, Number(options.copies) || 1);
    const gapMm = Number(options.gapMm) || 2;

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const widthBytes = Math.ceil(width / 8);
    const bitmapData = Buffer.alloc(widthBytes * height);

    // تحويل الصورة إلى مصفوفة نقطية أحادية اللون (Monochrome 1-bit)
    // في بروتوكول TSPL: 0 = أبيض (White)، 1 = أسود (Black)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // حساب الإضاءة (Luminance)
            const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            // البكسل الداكن (أقل من العتبة 160) يُعتبر نقطة سوداء
            if (lum < 160) {
                const byteIdx = y * widthBytes + Math.floor(x / 8);
                const bit = 7 - (x % 8);
                bitmapData[byteIdx] |= (1 << bit);
            }
        }
    }

    // بناء أوامر TSPL القياسية المعتمدة دولياً
    const header = Buffer.from(
        `SIZE ${widthMm} mm, ${heightMm} mm\r\n` +
        `GAP ${gapMm} mm, 0 mm\r\n` +
        `DIRECTION 1\r\n` +
        `CLS\r\n` +
        `BITMAP 0,0,${widthBytes},${height},0,`
    );

    const footer = Buffer.from(`\r\nPRINT ${copies},1\r\n`);

    return Buffer.concat([header, bitmapData, footer]);
}

/**
 * تشفير الـ Canvas إلى أوامر ESC/POS Raster (GS v 0) كخيار بديل للطابعات الحرارية العامة
 */
function encodeCanvasToEscPos(canvas, options = {}) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const widthBytes = Math.ceil(width / 8);
    const commands = [];

    // Set line spacing to 0
    commands.push(Buffer.from([0x1B, 0x33, 0x00]));

    const maxHeightPerChunk = 256;
    for (let startY = 0; startY < height; startY += maxHeightPerChunk) {
        const chunkHeight = Math.min(maxHeightPerChunk, height - startY);

        // Header: GS v 0 0 xL xH yL yH
        const xL = widthBytes & 0xFF;
        const xH = (widthBytes >> 8) & 0xFF;
        const yL = chunkHeight & 0xFF;
        const yH = (chunkHeight >> 8) & 0xFF;

        const header = Buffer.from([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
        const rasterData = Buffer.alloc(widthBytes * chunkHeight);

        for (let y = 0; y < chunkHeight; y++) {
            const currentY = startY + y;
            for (let x = 0; x < width; x++) {
                const idx = (currentY * width + x) * 4;
                const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
                if (lum < 160) {
                    const byteIdx = y * widthBytes + Math.floor(x / 8);
                    const bit = 7 - (x % 8);
                    rasterData[byteIdx] |= (1 << bit);
                }
            }
        }

        commands.push(header);
        commands.push(rasterData);
    }

    return Buffer.concat(commands);
}

module.exports = {
    encodeCanvasToTspl,
    encodeCanvasToEscPos
};
