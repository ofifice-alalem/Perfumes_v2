const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { fixArabic } = require('./arabic-helper');
const QRCode = require('qrcode');

// Register Cairo Font automatically
let isCairoRegistered = false;
function registerCairoFont() {
    if (isCairoRegistered) return;
    try {
        const fontPath700 = path.join(__dirname, '../../node_modules/@fontsource/cairo/files/cairo-arabic-700-normal.woff');
        const fontPath400 = path.join(__dirname, '../../node_modules/@fontsource/cairo/files/cairo-arabic-400-normal.woff');
        
        if (fs.existsSync(fontPath700)) {
            GlobalFonts.registerFromPath(fontPath700, 'Cairo');
        }
        if (fs.existsSync(fontPath400)) {
            GlobalFonts.registerFromPath(fontPath400, 'Cairo');
        }
        isCairoRegistered = true;
    } catch (err) {
        console.warn("Could not load Cairo font from node_modules, using system fallback font:", err.message);
    }
}

/**
 * Draws a rounded rectangle path on canvas
 */
function drawRoundedRect(ctx, x, y, width, height, radius = 6, fill = false, stroke = true) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
    ctx.restore();
}

/**
 * Draws a dashed rounded rectangle on canvas
 */
function drawDashedRoundedRect(ctx, x, y, width, height, radius = 6, dashPattern = [6, 4]) {
    ctx.save();
    ctx.setLineDash(dashPattern);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    drawRoundedRect(ctx, x, y, width, height, radius, false, true);
    ctx.restore();
}

/**
 * Draws Perfume Bottle with Taller Silhouette + Incense Sticks & Smoke
 */
function drawPerfumeWithIncenseIcon(ctx, x, y, width = 88, height = 110, isRightSide = false) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Taller Bottle Layout positioning
    const bottleWidth = 50;
    const bottleHeight = 92;
    const bottleX = isRightSide ? x : x + 34;
    const incenseX = isRightSide ? x + width - 10 : x + 10;

    const bottleCx = bottleX + bottleWidth / 2;
    const bottleY = y + 14;

    // -------------------------------------------------------------
    // 1. TALLER PERFUME BOTTLE (عبوة أكثر طولاً وأناقة)
    // -------------------------------------------------------------
    // Solid Black Cap
    ctx.fillStyle = '#000000';
    const capWidth = 22;
    const capHeight = 16;
    drawRoundedRect(ctx, bottleCx - capWidth / 2, bottleY, capWidth, capHeight, 4, true, false);

    // Solid Black Neck
    const neckWidth = 12;
    const neckHeight = 8;
    const neckY = bottleY + capHeight;
    ctx.fillRect(bottleCx - neckWidth / 2, neckY, neckWidth, neckHeight);

    // Glass Body with Taller Height & Smooth Curved Shoulders
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#000000';

    const bodyY = neckY + neckHeight;
    const bodyHeight = bottleHeight - (capHeight + neckHeight); // 68px

    ctx.beginPath();
    // Neck connection top left
    ctx.moveTo(bottleCx - neckWidth / 2, bodyY);
    // Smooth curved left shoulder (كوط الأكتاف)
    ctx.quadraticCurveTo(bottleX, bodyY, bottleX, bodyY + 16);
    // Left side down (Taller body)
    ctx.lineTo(bottleX, bodyY + bodyHeight - 10);
    // Bottom left corner
    ctx.quadraticCurveTo(bottleX, bodyY + bodyHeight, bottleX + 10, bodyY + bodyHeight);
    // Bottom edge
    ctx.lineTo(bottleX + bottleWidth - 10, bodyY + bodyHeight);
    // Bottom right corner
    ctx.quadraticCurveTo(bottleX + bottleWidth, bodyY + bodyHeight, bottleX + bottleWidth, bodyY + bodyHeight - 10);
    // Right side up to shoulder
    ctx.lineTo(bottleX + bottleWidth, bodyY + 16);
    // Smooth curved right shoulder
    ctx.quadraticCurveTo(bottleX + bottleWidth, bodyY, bottleCx + neckWidth / 2, bodyY);
    ctx.closePath();
    ctx.stroke();

    // Inner Dashed Rectangular Label Border (Taller)
    const labelW = 32;
    const labelH = 48;
    const labelX = bottleCx - labelW / 2;
    const labelY = bodyY + 10;

    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.8;
    drawRoundedRect(ctx, labelX, labelY, labelW, labelH, 2, false, true);
    ctx.restore();

    // Solid Black Diamond Emblem
    const diamondSize = 9;
    const diamondCy = labelY + labelH / 2;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(bottleCx, diamondCy - diamondSize);
    ctx.lineTo(bottleCx + diamondSize, diamondCy);
    ctx.lineTo(bottleCx, diamondCy + diamondSize);
    ctx.lineTo(bottleCx - diamondSize, diamondCy);
    ctx.closePath();
    ctx.fill();

    // -------------------------------------------------------------
    // 2. INCENSE STICKS & RISING SMOKE
    // -------------------------------------------------------------
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000000';

    // Base Incense Holder Tray
    const trayY = y + height - 6;
    ctx.fillRect(incenseX - 10, trayY, 20, 4);

    // Incense Stick 1
    const stick1TopX = isRightSide ? incenseX - 18 : incenseX + 18;
    const stick1TopY = y + 22;

    ctx.beginPath();
    ctx.moveTo(incenseX - (isRightSide ? 3 : -3), trayY);
    ctx.lineTo(stick1TopX, stick1TopY);
    ctx.stroke();

    // Burning Amber Tip 1
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(stick1TopX, stick1TopY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Incense Stick 2
    const stick2TopX = isRightSide ? incenseX - 26 : incenseX + 26;
    const stick2TopY = y + 36;

    ctx.beginPath();
    ctx.moveTo(incenseX + (isRightSide ? 3 : -3), trayY);
    ctx.lineTo(stick2TopX, stick2TopY);
    ctx.stroke();

    // Burning Amber Tip 2
    ctx.beginPath();
    ctx.arc(stick2TopX, stick2TopY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Elegant Incense Smoke Waves
    ctx.lineWidth = 2;

    // Smoke 1
    ctx.beginPath();
    ctx.moveTo(stick1TopX, stick1TopY - 3);
    ctx.bezierCurveTo(
        stick1TopX + (isRightSide ? -10 : 10), stick1TopY - 12,
        stick1TopX + (isRightSide ? 6 : -6), stick1TopY - 20,
        stick1TopX + (isRightSide ? -4 : 4), stick1TopY - 28
    );
    ctx.stroke();

    // Smoke 2
    ctx.beginPath();
    ctx.moveTo(stick2TopX, stick2TopY - 3);
    ctx.bezierCurveTo(
        stick2TopX + (isRightSide ? -8 : 8), stick2TopY - 12,
        stick2TopX + (isRightSide ? 8 : -8), stick2TopY - 18,
        stick2TopX + (isRightSide ? -2 : 2), stick2TopY - 24
    );
    ctx.stroke();

    ctx.restore();
}

/**
 * Draws the center store logo (either uploaded PNG image or oval badge with store name)
 */
async function drawCenterLogoOrOval(ctx, cx, cy, rx = 170, ry = 80, storeName = '', storeSubname = '', logoPath = '') {
    if (logoPath) {
        const normalizedPath = path.normalize(logoPath);
        if (fs.existsSync(normalizedPath)) {
            try {
                const imgBuffer = fs.readFileSync(normalizedPath);
                const logoImg = await loadImage(imgBuffer);
                const maxW = 440;
                const maxH = 180;
                const aspect = logoImg.width / logoImg.height;
                let drawW = maxW;
                let drawH = maxW / aspect;
                if (drawH > maxH) {
                    drawH = maxH;
                    drawW = maxH * aspect;
                }
                ctx.drawImage(logoImg, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
                return;
            } catch (e) {
                console.warn("Could not load logo image, falling back to oval badge:", e.message);
            }
        }
    }

    ctx.save();
    ctx.fillStyle = '#000000';

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    const mainTitle = storeName || 'تاجوري للعطور';
    const subTitle = storeSubname || 'للعطور الفاخرة';

    ctx.font = 'bold 28px Cairo, "Segoe UI", Arial, sans-serif';
    ctx.fillText(fixArabic(mainTitle), cx, cy - 18);

    if (subTitle) {
        ctx.font = '17px Cairo, "Segoe UI", Arial, sans-serif';
        ctx.fillText(fixArabic(subTitle), cx, cy + 20);
    }

    ctx.restore();
}

/**
 * Wraps text to fit maximum width
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(fixArabic(currentLine + " " + word)).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

/**
 * Renders the full 80mm thermal receipt with 4 columns (المنتج | الكمية | السعر | الإجمالي)
 */
async function renderInvoiceCanvas(invoiceData, config) {
    registerCairoFont();

    const width = config.printer?.printableWidthDots || 576; // 80mm printable width
    const margin = 20;
    const contentWidth = width - (margin * 2); // 536px

    // Calculate dynamic payments count
    const paymentsList = Array.isArray(invoiceData.payments) && invoiceData.payments.length > 0 
        ? invoiceData.payments 
        : [{ method: invoiceData.paymentMethod || 'نقداً', amount: invoiceData.paid ?? invoiceData.total }];

    // Estimate total height based on items & payments count
    const items = invoiceData.items || [];
    const itemRowsHeight = Math.max(items.length * 56, 55);
    const paymentsHeight = paymentsList.length * 40;
    const totalHeight = 1040 + itemRowsHeight + paymentsHeight;

    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    // Fill white thermal paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalHeight);
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    let y = 6;

    // -------------------------------------------------------------
    // 1. TOP GRAPHICS (رسم الشعار المرفوع أو الشعار الافتراضي)
    // -------------------------------------------------------------
    drawPerfumeWithIncenseIcon(ctx, margin + 4, y, 88, 110, false);
    await drawCenterLogoOrOval(ctx, width / 2, y + 64, 170, 80, config.store?.name, config.store?.subname, config.store?.logoPath);
    drawPerfumeWithIncenseIcon(ctx, width - margin - 92, y, 88, 110, true);

    y += 140;

    // -------------------------------------------------------------
    // 2. STORE NAME & ADDRESS
    // -------------------------------------------------------------
    ctx.font = 'bold 30px Cairo, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic(config.store?.name || 'تاجوري للعطور الفاخرة'), width / 2, y);
    y += 38;

    if (config.store?.subname) {
        ctx.font = 'bold 18px Cairo, "Segoe UI", Arial, sans-serif';
        ctx.fillText(fixArabic(config.store.subname), width / 2, y);
        y += 24;
    }

    if (config.store?.address) {
        ctx.font = 'bold 16px Cairo, "Segoe UI", Arial, sans-serif';
        const addressLines = config.store.address.split('\n');
        for (const line of addressLines) {
            if (line.trim()) {
                ctx.fillText(fixArabic(line.trim()), width / 2, y);
                y += 24;
            }
        }
    }

    // -------------------------------------------------------------
    // 3. INVOICE BADGE PILL (صندوق فاتورة مبيعات | 50621)
    // -------------------------------------------------------------
    const pillWidth = 300;
    const pillHeight = 54;
    const pillX = (width - pillWidth) / 2;

    ctx.fillStyle = '#000000';
    drawRoundedRect(ctx, pillX, y, pillWidth, pillHeight, 9, true, false);

    // Inner White Box for Invoice Number
    const numberBoxWidth = 100;
    const numberBoxHeight = 38;
    const numberBoxX = pillX + 12;
    const numberBoxY = y + 8;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, numberBoxX, numberBoxY, numberBoxWidth, numberBoxHeight, 6, true, false);

    // Invoice Number Text (Black text inside white box)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 25px Cairo, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic(invoiceData.invoiceNumber || '50621'), numberBoxX + (numberBoxWidth / 2), numberBoxY + 3);

    // "فاتورة مبيعات" Text (White text on black background)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Cairo, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic('فاتورة مبيعات'), pillX + pillWidth - 92, y + 11);

    ctx.fillStyle = '#000000';
    y += pillHeight + 14;

    // Solid Divider Line
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.lineWidth = 2.8;
    ctx.stroke();
    y += 16;

    // -------------------------------------------------------------
    // 4. DATE & CASHIER BOX (SINGLE LINE)
    // -------------------------------------------------------------
    const dateBoxHeight = 52;
    ctx.lineWidth = 2.2;
    drawRoundedRect(ctx, margin, y, contentWidth, dateBoxHeight, 9, false, true);

    ctx.font = 'bold 18px Cairo, "Segoe UI", Arial, sans-serif';

    // Right Side: Cashier (starts line in RTL)
    ctx.textAlign = 'right';
    const cashierLabel = fixArabic('الكاشير') + ': ' + fixArabic(invoiceData.cashier || 'سليم');
    ctx.fillText(cashierLabel, width - margin - 16, y + 14);

    // Left Side: Date/Time (ends line in RTL)
    ctx.textAlign = 'left';
    const dateValue = invoiceData.dateTime || '2026-08-18 | 07:38 AM';
    ctx.fillText(fixArabic(dateValue), margin + 16, y + 14);

    y += dateBoxHeight + 16;

    // -------------------------------------------------------------
    // 5. PRODUCTS TABLE (4 COLUMNS: المنتج | الكمية | السعر | الإجمالي)
    // -------------------------------------------------------------
    const tableHeaderHeight = 48;

    // 4 Columns Widths (Sum = 536px contentWidth)
    const colTotalWidth = 80;    // Leftmost column: الإجمالي
    const colPriceWidth = 80;    // Price column: السعر
    const colQtyWidth = 70;      // Quantity column: الكمية
    const colProductWidth = contentWidth - colTotalWidth - colPriceWidth - colQtyWidth; // 306px Product Name

    const xTotal = margin; // 20
    const xPrice = margin + colTotalWidth; // 100
    const xQty = margin + colTotalWidth + colPriceWidth; // 180
    const xProduct = margin + colTotalWidth + colPriceWidth + colQtyWidth; // 250

    // Black Header Row Fill
    ctx.fillStyle = '#000000';
    drawRoundedRect(ctx, margin, y, contentWidth, tableHeaderHeight, 0, true, false);

    // White Header Labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 19px Cairo, "Segoe UI", Arial, sans-serif';

    // Column 1 (Right): المنتج
    ctx.textAlign = 'right';
    ctx.fillText(fixArabic('المنتج'), width - margin - 14, y + 11);

    // Column 2: الكمية
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic('الكمية'), xQty + (colQtyWidth / 2), y + 11);

    // Column 3: السعر
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic('السعر'), xPrice + (colPriceWidth / 2), y + 11);

    // Column 4 (Left): الإجمالي
    ctx.textAlign = 'center';
    ctx.fillText(fixArabic('الإجمالي'), xTotal + (colTotalWidth / 2), y + 11);

    ctx.fillStyle = '#000000';
    y += tableHeaderHeight;

    const tableBodyStartY = y;

    // Table Item Rows
    ctx.font = 'bold 17px Cairo, "Segoe UI", Arial, sans-serif';

    for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const totalStr = `${item.total}`;
        const priceStr = `${item.price}`;
        const qtyStr = `${item.quantity}`;
        
        // Wrap long product names inside product column (width = 306px)
        const nameLines = wrapText(ctx, item.name, colProductWidth - 24);

        ctx.textAlign = 'right';
        for (let i = 0; i < nameLines.length; i++) {
            ctx.fillText(fixArabic(nameLines[i]), width - margin - 12, y + 10 + (i * 24));
        }

        ctx.textAlign = 'center';
        ctx.fillText(fixArabic(qtyStr), xQty + (colQtyWidth / 2), y + 10);
        ctx.fillText(fixArabic(priceStr), xPrice + (colPriceWidth / 2), y + 10);
        ctx.fillText(fixArabic(totalStr), xTotal + (colTotalWidth / 2), y + 10);

        const rowSpan = Math.max(nameLines.length * 24, 30) + 16;
        y += rowSpan;

        // Draw horizontal grid line between rows
        if (idx < items.length - 1) {
            ctx.beginPath();
            ctx.moveTo(margin, y);
            ctx.lineTo(width - margin, y);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    const tableBodyEndY = y;

    // Outer Table Border
    ctx.lineWidth = 2.2;
    ctx.strokeRect(margin, tableHeaderHeight ? tableBodyStartY - tableHeaderHeight : tableBodyStartY, contentWidth, (tableBodyEndY - tableBodyStartY) + tableHeaderHeight);

    // Inner Vertical Grid Lines (3 Vertical Dividers)
    ctx.beginPath();
    // Divider 1: Between Total and Price
    ctx.moveTo(xPrice, tableBodyStartY - tableHeaderHeight);
    ctx.lineTo(xPrice, tableBodyEndY);

    // Divider 2: Between Price and Qty
    ctx.moveTo(xQty, tableBodyStartY - tableHeaderHeight);
    ctx.lineTo(xQty, tableBodyEndY);

    // Divider 3: Between Qty and Product
    ctx.moveTo(xProduct, tableBodyStartY - tableHeaderHeight);
    ctx.lineTo(xProduct, tableBodyEndY);

    ctx.lineWidth = 1.8;
    ctx.stroke();

    y += 16;

    // Solid Underline below Table
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.lineWidth = 2.8;
    ctx.stroke();
    y += 18;

    // -------------------------------------------------------------
    // 6. TOTALS & PAYMENTS SECTION (عكس الترتيب: دينار 596)
    // -------------------------------------------------------------
    ctx.font = 'bold 17px Cairo, "Segoe UI", Arial, sans-serif';

    // Total Row
    ctx.textAlign = 'right';
    ctx.fillText(fixArabic('المجموع الإجمالي') + ':', width - margin - 10, y);
    ctx.textAlign = 'left';
    ctx.fillText(fixArabic('دينار'), margin + 10, y);
    const dinarW1 = ctx.measureText(fixArabic('دينار')).width;
    ctx.fillText(`${invoiceData.total}`, margin + 10 + dinarW1 + 6, y);
    y += 28;

    // Dotted Separator
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(margin + 5, y);
    ctx.lineTo(width - margin - 5, y);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    y += 12;

    // Render Each Payment Method Row
    for (let pIdx = 0; pIdx < paymentsList.length; pIdx++) {
        const p = paymentsList[pIdx];
        const paidLabel = fixArabic('المدفوع') + ' (' + fixArabic(p.method) + '):';

        ctx.font = 'bold 16px Cairo, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(paidLabel, width - margin - 10, y);
        ctx.textAlign = 'left';
        ctx.fillText(fixArabic('دينار'), margin + 10, y);
        const dinarW2 = ctx.measureText(fixArabic('دينار')).width;
        ctx.fillText(`${p.amount}`, margin + 10 + dinarW2 + 6, y);
        y += 28;

        // Dotted Separator between multiple payments or under payments
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(margin + 5, y);
        ctx.lineTo(width - margin - 5, y);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        y += 12;
    }

    // Due Box (المتبقي Box - Bordered box with white background)
    const dueBoxHeight = 44;
    ctx.lineWidth = 2.0;
    drawRoundedRect(ctx, margin, y, contentWidth, dueBoxHeight, 8, false, true);

    ctx.font = 'bold 18px Cairo, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fixArabic('المتبقي') + ' (Due):', width - margin - 18, y + 10);
    ctx.textAlign = 'left';
    ctx.fillText(fixArabic('دينار'), margin + 18, y + 10);
    const dinarW3 = ctx.measureText(fixArabic('دينار')).width;
    ctx.fillText(`${invoiceData.due}`, margin + 18 + dinarW3 + 6, y + 10);

    y += dueBoxHeight + 14;

    // Dotted Separator
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(margin + 5, y);
    ctx.lineTo(width - margin - 5, y);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
    y += 20;

    // -------------------------------------------------------------
    // 7. QR CODE, THANK YOU NOTE & RETURN POLICY BOX
    // -------------------------------------------------------------
    if (config.showQrCode !== false) {
        const qrContent = invoiceData.qrData || `Invoice #${invoiceData.invoiceNumber || '50621'} | ${config.store?.name || 'تاجوري للعطور'} | Total: ${invoiceData.total || 0} LYD`;
        try {
            const qrBuffer = await QRCode.toBuffer(qrContent, {
                margin: 1,
                width: 120,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            const qrImg = await loadImage(qrBuffer);
            const qrSize = 110;
            const qrX = (width - qrSize) / 2;
            ctx.drawImage(qrImg, qrX, y, qrSize, qrSize);
            y += qrSize + 18;
        } catch (err) {
            console.warn("Could not render QR code:", err.message);
        }
    }

    if (config.footerText) {
        ctx.font = 'bold 18px Cairo, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(fixArabic(config.footerText), width / 2, y);
        y += 32;
    }

    if (config.returnPolicy) {
        const policyBoxHeight = 54;
        drawDashedRoundedRect(ctx, margin, y, contentWidth, policyBoxHeight, 9, [6, 4]);

        ctx.font = 'bold 15px Cairo, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(fixArabic(config.returnPolicy), width / 2, y + 16);
        y += policyBoxHeight + 12;
    }

    // -------------------------------------------------------------
    // 8. BOTTOM TEAR-OFF DOTS LINE
    // -------------------------------------------------------------
    ctx.font = '15px Arial';
    ctx.textAlign = 'center';
    const tearDots = '●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●';
    ctx.fillText(tearDots, width / 2, y);
    y += 6;

    // Crop to final height
    const finalCanvas = createCanvas(width, y);
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.drawImage(canvas, 0, 0);

    return finalCanvas;
}

module.exports = {
    renderInvoiceCanvas
};
