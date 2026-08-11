const TIME_ZONE = 'Asia/Ho_Chi_Minh';

function toLocalDate(value: Date): Date {
  return new Date(value.toLocaleString('en-US', { timeZone: TIME_ZONE }));
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Trả về thứ Hai và Chủ nhật của tuần kế tiếp theo giờ Việt Nam. */
export function getNextWeekRange(referenceDate = new Date()) {
  const localDate = toLocalDate(referenceDate);
  const daysUntilNextMonday = ((8 - localDate.getDay()) % 7) || 7;
  const start = new Date(localDate);
  start.setDate(localDate.getDate() + daysUntilNextMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { weekStart: formatDate(start), weekEnd: formatDate(end) };
}
