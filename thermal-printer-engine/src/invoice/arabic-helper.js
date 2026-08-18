const reshaper = require('arabic-persian-reshaper');

/**
 * Reshapes Arabic text (joins letters into connected presentation forms).
 * Note: @napi-rs/canvas (Skia engine) handles glyph layout natively, so we only need
 * letter shaping (convertArabic). We do NOT perform string reversal/bidi reordering.
 */
function fixArabic(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    if (!str.trim()) return str;

    // Check if text contains any Arabic characters
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
    if (!hasArabic) {
        return str;
    }

    try {
        const convertFn = reshaper.convertArabic || reshaper.ArabicShaper?.convertArabic;
        let reshaped = convertFn ? convertFn(str) : str;
        // Fix reshaper bug where 'لزيارتكم' turns into 'لويارتكم'
        reshaped = reshaped.replace(/لويارتكم/g, 'ﻟﺰﻳﺎﺭﺗﻜﻢ').replace(/\u0648\u064A\u0627\u0631\u062A\u0643\u0645/g, 'ﻟﺰﻳﺎﺭﺗﻜﻢ');
        return reshaped;
    } catch (err) {
        console.warn("Arabic shaping error, falling back to original string:", err.message);
        return str;
    }
}

module.exports = {
    fixArabic
};
