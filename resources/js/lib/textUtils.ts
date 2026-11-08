/**
 * Arabic & Text Search Normalization Utilities
 * Supports deep phonetic matching, diacritic stripping, alef/hamza unification,
 * teh marbuta normalization, and Levenshtein distance tolerance for typos.
 */

export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    // إزالة التشكيل الكامل والتنوين والشدة
    .replace(/[\u0617-\u061A\u064B-\u065F\u0670]/g, '')
    // إزالة التطويل (الكشيدة)
    .replace(/[\u0640]/g, '')
    // توحيد جميع أشكال الألف والهمزات (أ، إ، آ، ٱ) إلى ألف مجردة (ا)
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد همزة الواو (ؤ) إلى واو (و)
    .replace(/[ؤ]/g, 'و')
    // توحيد همزة النبرة (ئ)، والألف المقصورة (ى)، والياء الفارسية/الأردية إلى ياء عادية (ي)
    .replace(/[ئىي\u06CC\u06D0\u06D1\u06D2\u06D3]/g, 'ي')
    // توحيد التاء المربوطة (ة) وأشكال الهاء المتطرفة (ۀ، ہ، ۂ) إلى هاء (ه)
    .replace(/[ةۀہۂ\u06C0-\u06C3\u06D5]/g, 'ه')
    // توحيد الكاف الفارسية/الأردية (ک) إلى كاف عربية (ك)
    .replace(/[کڪګ]/g, 'ك')
    // تحويل الأرقام المشرقية والفارسية إلى أرقام إنجليزية موحدة
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    // إزالة المحارف المخفية
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    // استبدال علامات الترقيم والأقواس بمسافة
    .replace(/[()[\]{}_+\-–—=~`!@#$%^&*|\\:;"'<>,.?/]/g, ' ')
    // توحيد المسافات وقص الحواف
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAl(word: string): string {
  if (word && word.startsWith('ال') && word.length > 3) {
    return word.slice(2);
  }
  return word;
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function matchesSearchText(query: string, target: string, extraSearchKey?: string): boolean {
  const rawQ = query ? query.trim() : '';
  if (!rawQ) return true;

  const normQ = normalizeSearchText(rawQ);
  if (!normQ) return true;

  const normT = normalizeSearchText(target || '');
  const normKey = extraSearchKey ? normalizeSearchText(extraSearchKey) : '';
  const fullTarget = normKey ? `${normT} ${normKey}` : normT;

  if (fullTarget.includes(normQ)) return true;

  const qTokens = normQ.split(' ').filter(Boolean);
  if (qTokens.length === 0) return true;

  const tTokens = fullTarget.split(' ').filter(Boolean);
  const tTokensExpanded = [
    ...tTokens,
    ...tTokens.map(t => stripAl(t)).filter(t => t.length > 2),
  ];

  return qTokens.every(qToken => {
    if (fullTarget.includes(qToken)) return true;

    const qTokenNoAl = stripAl(qToken);
    if (qTokenNoAl !== qToken && fullTarget.includes(qTokenNoAl)) return true;

    return tTokensExpanded.some(tToken => {
      if (tToken.includes(qToken)) return true;
      if (qTokenNoAl !== qToken && tToken.includes(qTokenNoAl)) return true;

      const minLen = Math.min(qToken.length, tToken.length);
      if (minLen >= 4 && Math.abs(qToken.length - tToken.length) <= 1) {
        if (levenshteinDistance(qToken, tToken) <= 1) return true;
      }
      if (minLen >= 8 && Math.abs(qToken.length - tToken.length) <= 2) {
        if (levenshteinDistance(qToken, tToken) <= 2) return true;
      }
      return false;
    });
  });
}
