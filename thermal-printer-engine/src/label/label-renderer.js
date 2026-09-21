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

/** تحويل الأرقام إلى الأرقام الإنجليزية القياسية (0123456789) ومنع ظهور الأرقام الهندية أو المشرقية */
function toAsciiDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

/** تحويل كود إلى 13 خانة لصيغة EAN-13 مع فرض أرقام 0-9 */
function toEan13(code) {
    const digits = toAsciiDigits(code).replace(/\D/g, '');
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
 * تقسيم العنوان بذكاء إلى سطر أو سطرين حسب العرض المتاح مع الحفاظ على الكلمات كاملة
 * @param {CanvasRenderingContext2D} ctx سياق الرسم
 * @param {string} text نص العنوان
 * @param {number} maxW أقصى عرض متاح للسطر بالبكسل
 * @returns {string[]} مصفوفة الأسطر (سطر أو سطرين)
 */
function splitTitleLines(ctx, text, maxW) {
    if (!text) return [];
    const trimmed = String(text).trim();
    if (!trimmed) return [];
    if (ctx.measureText(trimmed).width <= maxW) {
        return [trimmed];
    }
    const words = trimmed.split(/\s+/);
    if (words.length <= 1) {
        return [trimmed];
    }
    let line1 = '';
    let line2 = '';
    const mid = Math.ceil(words.length / 2);
    for (let i = 0; i < words.length; i++) {
        const testLine = line1 ? (line1 + ' ' + words[i]) : words[i];
        if (i < mid || ctx.measureText(testLine).width <= maxW) {
            line1 = testLine;
        } else {
            line2 = words.slice(i).join(' ');
            break;
        }
    }
    if (!line2 && words.length > 1) {
        line1 = words.slice(0, mid).join(' ');
        line2 = words.slice(mid).join(' ');
    }
    return line2 ? [line1, line2] : [line1];
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

    // إذا تم تحديد حجم خط مخصص للعنوان بالنقاط pt نحوله إلى بكسل الكانفاس (203 DPI ≈ 2.82 dots/pt)
    const customTitleFontSizePx = (labelData.titleFontSize && Number(labelData.titleFontSize) > 0)
        ? Math.round(Number(labelData.titleFontSize) * 2.82)
        : null;

    if (tab === 'classic') {
        // ── نمط الـ QR Code المربع ──────────────────────────────────────────
        let curY = 6;
        if (showName && productName) {
            const nameFontSize = customTitleFontSizePx || Math.min(32, Math.max(16, Math.round(innerH * (widthMm <= 40 ? 0.10 : 0.12))));
            ctx.font = `800 ${nameFontSize}px Tajawal, TajawalLatin, Cairo, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const maxTitleW = innerW - (widthMm <= 40 ? 20 : 28);
            const titleLines = splitTitleLines(ctx, productName, maxTitleW);
            for (const line of titleLines) {
                ctx.fillText(line, innerW / 2, curY, maxTitleW);
                curY += nameFontSize + 2;
            }
            curY += 4;
        }

        const remainingH = innerH - curY - 6;
        const qrSize = Math.max(50, Math.min(Math.round(innerW * 0.44), remainingH - 4));
        const qrX = innerW - qrSize - 12;
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
        const infoW = qrX - 12;
        const infoCx = infoW / 2 + 6;
        let infoY = curY + Math.round(remainingH * 0.10);

        if (showCodeText && code) {
            const cleanCode = toAsciiDigits(code);
            const codeFontSize = Math.min(22, Math.max(13, Math.round(innerH * 0.075)));
            ctx.font = `700 ${codeFontSize}px TajawalLatin, Arial, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(cleanCode, infoCx, infoY, infoW);
            infoY += codeFontSize + 10;
        }

        if (showPrice && price) {
            const cleanPrice = toAsciiDigits(price);
            const priceFontSize = Math.min(46, Math.max(22, Math.round(innerH * 0.17)));
            ctx.font = `800 ${priceFontSize}px TajawalLatin, Tajawal, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(cleanPrice, infoCx, infoY, infoW);
        }

    } else {
        // ── نمط الباركود الشريطي (EAN-13 أو Code 128) ─────────────────────
        const nameFontSize = customTitleFontSizePx || Math.min(34, Math.max(16, Math.round(innerH * 0.11)));
        const priceFontSize = Math.min(48, Math.max(18, Math.round(innerH * 0.16)));

        const titleLines = (showName && productName) ? splitTitleLines(ctx, productName, innerW - 16) : [];
        const nameH = titleLines.length > 0 ? (titleLines.length * (nameFontSize + 4) + 4) : 0;
        const priceH = (showPrice && price) ? (priceFontSize + 8) : 0;
        const barAvailableH = Math.max(35, innerH - nameH - priceH - 10);

        let curY = 8;
        if (titleLines.length > 0) {
            ctx.font = `800 ${nameFontSize}px Tajawal, TajawalLatin, Cairo, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            for (const line of titleLines) {
                ctx.fillText(line, innerW / 2, curY, innerW - 16);
                curY += nameFontSize + 3;
            }
            curY += 2;
        }

        const barcodeVal = toAsciiDigits(tab === 'ean13' ? toEan13(code) : code);
        const barcodeFormat = tab === 'ean13' ? 'EAN13' : 'CODE128';

        // حساب عرض العمود modW بحيث لا يتجاوز عرض الملصق نهائياً ولا يخرج عن الحواف
        const maxBarcodeW = innerW - 28;
        const estModules = tab === 'ean13' ? 108 : Math.max(70, (String(barcodeVal).length + 2) * 11);
        const modW = Math.max(1.4, Math.min(3.8, Math.floor((maxBarcodeW / estModules) * 10) / 10));
        const digitFontSize = Math.min(22, Math.max(12, Math.round(innerH * 0.075)));

        const barCanvas = createCanvas(innerW, barAvailableH);
        const bCtx = barCanvas.getContext('2d');
        bCtx.fillStyle = '#FFFFFF';
        bCtx.fillRect(0, 0, innerW, barAvailableH);

        try {
            JsBarcode(barCanvas, barcodeVal, {
                format: barcodeFormat,
                displayValue: showCodeText,
                fontSize: digitFontSize,
                font: 'TajawalLatin, Arial, sans-serif',
                textMargin: 3,
                margin: 0,
                width: modW,
                height: showCodeText ? Math.max(25, barAvailableH - digitFontSize - 8) : barAvailableH,
                lineColor: '#000000',
            });

            // قياس حدود الرسم الفعلي بدقة لضمان التوسيط التام في المنتصف 100%
            const imgData = bCtx.getImageData(0, 0, innerW, barAvailableH).data;
            let minX = innerW, maxX = 0;
            for (let y = 0; y < barAvailableH; y += 2) {
                for (let x = 0; x < innerW; x++) {
                    const idx = (y * innerW + x) * 4;
                    if (imgData[idx] < 128 && imgData[idx + 3] > 128) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                    }
                }
            }

            const drawnWidth = (maxX >= minX) ? (maxX - minX + 1) : innerW;
            const drawX = Math.round((innerW - drawnWidth) / 2);
            ctx.drawImage(barCanvas, minX, 0, drawnWidth, barAvailableH, drawX, curY, drawnWidth, barAvailableH);
            curY += barAvailableH + 4;
        } catch (e) {
            console.error("Error drawing JsBarcode on label:", e.message);
        }

        if (showPrice && price) {
            const cleanPrice = toAsciiDigits(price);
            ctx.font = `800 ${priceFontSize}px TajawalLatin, Tajawal, Cairo, CairoLatin, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(cleanPrice, innerW / 2, curY, innerW - 12);
        }
    }

    ctx.restore();
    return canvas;
}

module.exports = {
    renderLabelCanvas,
    toEan13
};
