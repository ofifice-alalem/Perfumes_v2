/**
 * @napi-rs/canvas is built on Google Skia with embedded HarfBuzz OpenType shaper.
 * It natively connects Arabic characters, shapes ligatures, and handles BiDi.
 * Bypassing legacy 8-bit reshapers preserves full Unicode 15 glyph integrity and prevents tofu boxes (□).
 */
function fixArabic(text) {
    if (text === null || text === undefined) return '';
    return String(text);
}

module.exports = {
    fixArabic
};
