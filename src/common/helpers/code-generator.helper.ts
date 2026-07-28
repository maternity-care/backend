// Chuyen ten tieng Viet/co dau thanh prefix code de luu DB.
// Vi du: "Sieu am thai 2D" -> "SIEU_AM_THAI_2D".
export function buildCodePrefixFromName(name: string, fallback = 'CODE', maxLength = 40): string {
  const normalized = String(name)
    .trim()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  return normalized ? normalized.split(' ').join('_').slice(0, maxLength) : fallback;
}

// Tim so thu tu tiep theo dua tren cac code da ton tai.
// Vi du existing: ["SIEU_AM", "SIEU_AM_02"] -> next = "SIEU_AM_03".
export function buildNextCodeFromExisting(prefix: string, existingCodes: string[]): string {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}_(\\d+)$`);
  const maxSequence = existingCodes.reduce((max, code) => {
    if (code === prefix) return Math.max(max, 1);
    const match = code.match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  const nextSequence = maxSequence + 1;
  return nextSequence === 1 && !existingCodes.includes(prefix)
    ? prefix
    : `${prefix}_${String(nextSequence).padStart(2, '0')}`;
}
