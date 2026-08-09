export function buildNextFacilityCode(province: string | null | undefined, existingCodes: string[]): string {
  const prefix = `CS-${buildProvinceAbbreviation(province)}`;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nextSequence = existingCodes.reduce((maxSequence, code) => {
    const match = code.match(new RegExp(`^${escapedPrefix}-(\\d+)$`));
    return match ? Math.max(maxSequence, Number(match[1])) : maxSequence;
  }, 0) + 1;

  return `${prefix}-${String(nextSequence).padStart(2, '0')}`;
}

export function buildFacilityCodePrefix(province: string | null | undefined): string {
  return `CS-${buildProvinceAbbreviation(province)}`;
}

function buildProvinceAbbreviation(province: string | null | undefined): string {
  if (!province || !String(province).trim()) {
    return 'VN';
  }

  const normalizedProvince = normalizeVietnameseText(province)
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(THANH PHO|TINH|TP)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalizedProvince.split(' ').filter(Boolean);
  if (words.length === 0) return 'VN';
  return words.map(word => word[0]).join('').toUpperCase();
}

function normalizeVietnameseText(value: string): string {
  return String(value)
    .trim()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}
