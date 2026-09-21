const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const { fixArabic } = require('../invoice/arabic-helper');

// تسجيل خط تاجوال والقاهرة (Arabic + Latin) لضمان طباعة الأرقام والإنجليزية دون مربعات
let isTajawalRegistered = false;
function registerTajawalFont() {
    if (isTajawalRegistered) return;
    try {
        const tajawalDir = path.join(__dirname, '../../../node_modules/@fontsource/tajawal/files');
        const cairoDir = path.join(__dirname, '../../node_modules/@fontsource/cairo/files');

        // تسجيل خطوط تاجوال (عربي + لاتيني للأرقام)
        if (fs.existsSync(tajawalDir)) {
            const fontPath900 = path.join(tajawalDir, 'tajawal-arabic-900-normal.woff');
            const fontPath800 = path.join(tajawalDir, 'tajawal-arabic-800-normal.woff');
            const fontPath700 = path.join(tajawalDir, 'tajawal-arabic-700-normal.woff');
            const fontPath400 = path.join(tajawalDir, 'tajawal-arabic-400-normal.woff');
            const fontPathLat900 = path.join(tajawalDir, 'tajawal-latin-900-normal.woff');
            const fontPathLat800 = path.join(tajawalDir, 'tajawal-latin-800-normal.woff');
            const fontPathLat700 = path.join(tajawalDir, 'tajawal-latin-700-normal.woff');
            const fontPathLat400 = path.join(tajawalDir, 'tajawal-latin-400-normal.woff');

            if (fs.existsSync(fontPath900)) GlobalFonts.registerFromPath(fontPath900, 'Tajawal');
            if (fs.existsSync(fontPath800)) GlobalFonts.registerFromPath(fontPath800, 'Tajawal');
            if (fs.existsSync(fontPath700)) GlobalFonts.registerFromPath(fontPath700, 'Tajawal');
            if (fs.existsSync(fontPath400)) GlobalFonts.registerFromPath(fontPath400, 'Tajawal');
            if (fs.existsSync(fontPathLat900)) GlobalFonts.registerFromPath(fontPathLat900, 'TajawalLatin');
            if (fs.existsSync(fontPathLat800)) GlobalFonts.registerFromPath(fontPathLat800, 'TajawalLatin');
            if (fs.existsSync(fontPathLat700)) GlobalFonts.registerFromPath(fontPathLat700, 'TajawalLatin');
            if (fs.existsSync(fontPathLat400)) GlobalFonts.registerFromPath(fontPathLat400, 'TajawalLatin');
        }

        // تسجيل خط القاهرة كبديل احتياطي (عربي + لاتيني)
        if (fs.existsSync(cairoDir)) {
            const cairo700 = path.join(cairoDir, 'cairo-arabic-700-normal.woff');
            const cairo400 = path.join(cairoDir, 'cairo-arabic-400-normal.woff');
            const cairoLat700 = path.join(cairoDir, 'cairo-latin-700-normal.woff');
            const cairoLat400 = path.join(cairoDir, 'cairo-latin-400-normal.woff');

            if (fs.existsSync(cairo700)) GlobalFonts.registerFromPath(cairo700, 'Cairo');
            if (fs.existsSync(cairo400)) GlobalFonts.registerFromPath(cairo400, 'Cairo');
            if (fs.existsSync(cairoLat700)) GlobalFonts.registerFromPath(cairoLat700, 'CairoLatin');
            if (fs.existsSync(cairoLat400)) GlobalFonts.registerFromPath(cairoLat400, 'CairoLatin');
        }

        isTajawalRegistered = true;
    } catch (err) {
        console.warn("Could not load fonts in Node canvas:", err.message);
    }
}

/** تحويل كود إلى 13 خانة لصيغة EAN-13 */
function toEan13(code) {
    const digits = String(code || '').replace(/\D/g, '');
    let base12 = '';
    if (digits.length === 12) {
        base12 = digits;
    } else if (digits.length === 13) {
        base12 = digits.slice(0, 12);
    } else if (digits.length === 10) {
        base12 = '20' + digits;
    } else {
        base12 = digits.padStart(12, '0').slice(-12);
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(base12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return base12 + checkDigit;
}

/**
 * رسم ملصق الباركود أو الـ QR بدقة 203 DPI (8 dots per mm)
 * 
 * @param {Object} labelData بيانات الملصق
 * @returns {Promise<Canvas>}
 */
async function renderLabelCanvas(labelData = {}) {
    registerTajawalFont();

    const widthMm = Number(labelData.widthMm) || 50;
    const heightMm = Number(labelData.heightMm) || 25;
    const rotation = Number(labelData.rotation) || 0;
    const offsetX = Number(labelData.offsetX) || 0;
    const offsetY = Number(labelData.offsetY) || 0;

    const tab = labelData.tab || 'ean13'; // 'ean13' | 'serial' | 'classic'
    const productName = labelData.productName || 'عطر تاجوري الفاخر';
    const price = labelData.price ? String(labelData.price) : '';
    const code = labelData.code || '240000669027';

    const showName = labelData.showName !== false;
    const showPrice = labelData.showPrice !== false;
    const showCodeText = labelData.showCodeText !== false;

    // تحويل المليمتر إلى نقاط (203 DPI ≈ 8 dots/mm)
    const DOTS_PER_MM = 8;
    const isRotated = rotation === 90 || rotation === 270;
    const innerW = Math.round((isRotated ? heightMm : widthMm) * DOTS_PER_MM);
    const innerH = Math.round((isRotated ? widthMm : heightMm) * DOTS_PER_MM);

    // Canvas بأبعاد الملصق
    const totalW = Math.round(widthMm * DOTS_PER_MM);
    const totalH = Math.round(heightMm * DOTS_PER_MM);

    const canvas = createCanvas(totalW, totalH);
    const ctx = canvas.getContext('2d');

    // خلفية بيضاء نقية
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalW, totalH);

    ctx.save();
    // نقطة المركز لتطبيق الدوران والإزاحة
    ctx.translate(totalW / 2 + offsetX * DOTS_PER_MM, totalH / 2 + offsetY * DOTS_PER_MM);
    if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
    }
    // إعادة النقطة إلى الزاوية العليا اليسرى للمحتوى الداخلي
    ctx.translate(-innerW / 2, -innerH / 2);

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    if (tab === 'classic') {
        // ── نمط الـ QR Code المربع ──────────────────────────────────────────
        let curY = 6;
        if (showName && productName) {
            const nameFontSize = Math.min(26, Math.max(16, Math.round(innerH * 0.14)));
            ctx.font = `700 ${nameFontSize}px Tajawal, TajawalLatin, Cairo, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(fixArabic(productName), innerW / 2, curY, innerW - 12);
            curY += nameFontSize + 6;
        }

        const remainingH = innerH - curY - 6;
        const qrSize = Math.max(50, Math.min(Math.round(innerW * 0.42), remainingH - 4));
        const qrX = innerW - qrSize - 10;
        const qrY = curY + Math.max(0, Math.round((remainingH - qrSize) / 2));

        // توليد ورسم QR Code
        try {
            const qrCanvas = createCanvas(qrSize, qrSize);
            await QRCode.toCanvas(qrCanvas, code, {
                errorCorrectionLevel: 'H',
                margin: 0,
                width: qrSize,
                color: { dark: '#000000', light: '#FFFFFF' }
            });
            ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        } catch (e) {
            console.error("Error generating QR for label:", e.message);
        }

        // تفاصيل النص والسعر جهة اليسار
        const infoW = qrX - 8;
        const infoCx = infoW / 2 + 4;
        let infoY = curY + Math.round(remainingH * 0.15);

        if (showCodeText && code) {
            ctx.font = '700 16px Tajawal, TajawalLatin, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(code, infoCx, infoY, infoW);
            infoY += 24;
        }

        if (showPrice && price) {
            const priceFontSize = Math.min(32, Math.max(20, Math.round(innerH * 0.18)));
            ctx.font = `700 ${priceFontSize}px Tajawal, TajawalLatin, Cairo, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(fixArabic(price), infoCx, infoY, infoW);
        }

    } else {
        // ── نمط الباركود الشريطي (EAN-13 أو Code 128) ─────────────────────
        let topY = 6;
        if (showName && productName) {
            const nameFontSize = Math.min(24, Math.max(16, Math.round(innerH * 0.13)));
            ctx.font = `700 ${nameFontSize}px Tajawal, TajawalLatin, Cairo, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(fixArabic(productName), innerW / 2, topY, innerW - 12);
            topY += nameFontSize + 6;
        }

        let bottomReservedH = 0;
        if (showPrice && price) {
            bottomReservedH = Math.min(28, Math.max(20, Math.round(innerH * 0.15))) + 6;
        }

        const maxBarH = Math.min(Math.round(innerH * 0.50), 140);
        const barAvailableH = Math.max(40, Math.min(innerH - topY - bottomReservedH - 8, maxBarH));
        const barCanvas = createCanvas(innerW - 24, barAvailableH);

        try {
            const barcodeVal = tab === 'ean13' ? toEan13(code) : code;
            const barcodeFormat = tab === 'ean13' ? 'EAN13' : 'CODE128';

            JsBarcode(barCanvas, barcodeVal, {
                format: barcodeFormat,
                displayValue: showCodeText,
                fontSize: 16,
                font: 'Tajawal, TajawalLatin, Arial, sans-serif',
                textMargin: 3,
                margin: 0,
                width: 1.8,
                height: showCodeText ? barAvailableH - 24 : barAvailableH,
                lineColor: '#000000',
            });

            // رسم الباركود في المنتصف
            const drawX = Math.round((innerW - barCanvas.width) / 2);
            ctx.drawImage(barCanvas, drawX, topY, barCanvas.width, barAvailableH);
            topY += barAvailableH + 6;
        } catch (e) {
            console.error("Error drawing JsBarcode on label:", e.message);
        }

        if (showPrice && price) {
            const priceFontSize = Math.min(28, Math.max(18, Math.round(innerH * 0.15)));
            ctx.font = `700 ${priceFontSize}px Tajawal, TajawalLatin, Cairo, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(fixArabic(price), innerW / 2, topY, innerW - 12);
        }
    }

    ctx.restore();
    return canvas;
}

module.exports = {
    renderLabelCanvas,
    toEan13
};
