const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Converts a PNG image buffer or Canvas into raw ESC/POS raster graphics command buffer.
 * Uses standard GS v 0 (Print raster bit image) command supported by all POS-80 / XP-80 printers.
 * 
 * @param {Buffer} pngBuffer PNG image buffer of the invoice
 * @param {Object} options Options like cutPaper and feedLines
 * @returns {Promise<Buffer>} Raw binary buffer ready for thermal printer
 */
async function encodePngToEscPosRaster(input, options = {}) {
    let canvas, ctx, width, height;

    if (input && typeof input.getContext === 'function') {
        canvas = input;
        ctx = canvas.getContext('2d');
        width = canvas.width;
        height = canvas.height;
    } else {
        const img = await loadImage(input);
        width = img.width;
        height = img.height;
        canvas = createCanvas(width, height);
        ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data; // Uint8ClampedArray [R, G, B, A, R, G, B, A...]

    // Calculate width in bytes (must be multiple of 8)
    const widthBytes = Math.ceil(width / 8);

    // Prepare ESC/POS command buffers
    const commands = [];

    // 1. Initialize printer (ESC @)
    commands.push(Buffer.from([0x1B, 0x40]));

    // 2. Set line spacing to 0 for continuous raster print (ESC 3 0)
    commands.push(Buffer.from([0x1B, 0x33, 0x00]));

    // We print raster image in blocks (e.g. max 240-256 lines per GS v 0 slice to prevent printer buffer overflow)
    const maxHeightPerChunk = 256;

    for (let startY = 0; startY < height; startY += maxHeightPerChunk) {
        const chunkHeight = Math.min(maxHeightPerChunk, height - startY);

        // GS v 0 command header: 0x1D 0x76 0x30 0 xL xH yL yH
        const xL = widthBytes & 0xFF;
        const xH = (widthBytes >> 8) & 0xFF;
        const yL = chunkHeight & 0xFF;
        const yH = (chunkHeight >> 8) & 0xFF;

        const header = Buffer.from([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
        const rasterData = Buffer.alloc(widthBytes * chunkHeight);

        for (let y = 0; y < chunkHeight; y++) {
            const currentY = startY + y;
            for (let x = 0; x < width; x++) {
                const pixelIndex = (currentY * width + x) * 4;
                const r = pixels[pixelIndex];
                const g = pixels[pixelIndex + 1];
                const b = pixels[pixelIndex + 2];
                const a = pixels[pixelIndex + 3];

                // Convert pixel to monochrome (luminance thresholding)
                // If pixel is dark and not transparent, it's a printed black dot (1), otherwise white (0)
                const isBlack = (a > 128) && ((r * 0.299 + g * 0.587 + b * 0.114) < 160);

                if (isBlack) {
                    const byteIndex = y * widthBytes + Math.floor(x / 8);
                    const bitIndex = 7 - (x % 8);
                    rasterData[byteIndex] |= (1 << bitIndex);
                }
            }
        }

        commands.push(header);
        commands.push(rasterData);
    }

    // 3. Reset line spacing to default (ESC 2)
    commands.push(Buffer.from([0x1B, 0x32]));

    // 4. Feed lines
    const feedLines = options.feedLinesAfterPrint ?? 4;
    if (feedLines > 0) {
        commands.push(Buffer.from([0x1B, 0x64, feedLines]));
    }

    // 5. Paper Cut Command (GS V 66 0 -> 0x1D 0x56 0x42 0x00)
    if (options.cutPaper !== false) {
        commands.push(Buffer.from([0x1D, 0x56, 0x42, 0x00]));
    }

    return Buffer.concat(commands);
}

module.exports = {
    encodePngToEscPosRaster
};
