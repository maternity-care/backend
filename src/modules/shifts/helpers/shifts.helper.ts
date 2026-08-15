import { BadRequestException, ConflictException } from '@nestjs/common';
import { DoctorShiftStatus } from '../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';
import { ShiftConflicts } from '../interfaces/shift-conflicts.interface';
import { ShiftWorkingDay } from '../dto/requests/bulk-create-doctor-shift.dto';

export interface FacilityOperatingHourLike {
  dayOfWeek?: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

/** Input toi thieu de resolve khoang ngay cho cac API tao ca hang loat. */
export interface BulkCreateDateRangeInput {
  fromDate?: string;
  toDate?: string;
  durationDays?: number;
}

const DAY_MINUTES = 24 * 60;
const START_OF_DAY = '00:00:00';
const END_OF_DAY = '23:59:00';

/** Kiểm tra id nhận từ path trước khi truy vấn database. */
export function validateShiftId(id: string): void {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.SHIFT_ID_INVALID);
  }
}

/** Ca đã kết thúc chỉ còn được xem để bảo toàn lịch sử vận hành. */
export function isShiftInPast(
  shiftDate: string,
  startTime: string,
  endTime: string,
): boolean {
  const normalizedStart = normalizeTime(startTime);
  const normalizedEnd = normalizeTime(endTime);
  const endDate = isOvernightRange(normalizedStart, normalizedEnd)
    ? addDays(shiftDate, 1)
    : shiftDate;
  const endAt = new Date(`${endDate}T${normalizedEnd}+07:00`);
  return endAt.getTime() <= Date.now();
}

/** Kiểm tra thứ tự giờ, độ dài ca và ngày trong quá khứ. */
export function validateSchedule(
  shiftDate: string,
  startTime: string,
  endTime: string,
  requireFuture: boolean,
): void {
  const normalizedStart = normalizeTime(startTime);
  const normalizedEnd = normalizeTime(endTime);
  if (normalizedStart === normalizedEnd) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.END_TIME_AFTER_START_TIME);
  }
  const duration = getTimeRangeDurationMinutes(normalizedStart, normalizedEnd);
  if (duration < 15 || duration > 12 * 60) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.DURATION_INVALID);
  }
  if (requireFuture && shiftDate < todayInVietnam()) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.PAST_DATE_INVALID);
  }
}

/** Ca nghỉ không sử dụng phòng khám. */
export function validateStatusDetails(status: DoctorShiftStatus, roomId?: string | null): void {
  if (status === DoctorShiftStatus.OFF && roomId) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.OFF_SHIFT_CANNOT_HAVE_ROOM);
  }
}

/** Đảm bảo ca làm việc nằm trong giờ mở cửa của facility. */
export function validateFacilityHours(
  operatingHour: FacilityOperatingHourLike | null | undefined,
  startTime: string,
  endTime: string,
  status: DoctorShiftStatus,
  nextOperatingHour?: FacilityOperatingHourLike | null,
): void {
  // kiểm tra status của shift, nếu là OFF hoặc CANCELLED thì không cần kiểm tra giờ mở cửa
  if (status === DoctorShiftStatus.OFF || status === DoctorShiftStatus.CANCELLED) return;

  // kiểm tra operatingHour có tồn tại và không bị đóng cửa
  if (!operatingHour || operatingHour.isClosed) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.FACILITY_CLOSED_ON_DATE);
  }


  const openTime = operatingHour.openTime ? normalizeTime(String(operatingHour.openTime)) : null;
  const closeTime = operatingHour.closeTime ? normalizeTime(String(operatingHour.closeTime)) : null;
  
  if (!openTime || !closeTime) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.FACILITY_HOURS_NOT_CONFIGURED);
  }

  const normalizedStart = normalizeTime(startTime);
  const normalizedEnd = normalizeTime(endTime);
  if (isOvernightRange(normalizedStart, normalizedEnd)) {
    if (normalizedStart < openTime || END_OF_DAY > closeTime) {
      throw new BadRequestException(
        `${RESPONSE_MESSAGES.SHIFTS.FACILITY_HOURS_INVALID} (${openTime} - ${closeTime})`,
      );
    }

    if (!nextOperatingHour || nextOperatingHour.isClosed) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.FACILITY_CLOSED_ON_DATE);
    }

    const nextOpenTime = nextOperatingHour.openTime ? normalizeTime(String(nextOperatingHour.openTime)) : null;
    const nextCloseTime = nextOperatingHour.closeTime ? normalizeTime(String(nextOperatingHour.closeTime)) : null;
    if (!nextOpenTime || !nextCloseTime) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.FACILITY_HOURS_NOT_CONFIGURED);
    }

    if (START_OF_DAY < nextOpenTime || normalizedEnd > nextCloseTime) {
      throw new BadRequestException(
        `${RESPONSE_MESSAGES.SHIFTS.FACILITY_HOURS_INVALID} (${nextOpenTime} - ${nextCloseTime})`,
      );
    }
    return;
  }

  if (normalizedStart < openTime || normalizedEnd > closeTime) {
    throw new BadRequestException(
      `${RESPONSE_MESSAGES.SHIFTS.FACILITY_HOURS_INVALID} (${openTime} - ${closeTime})`,
    );
  }
}

/** Chuyển 07:00 và 07:00:00 về cùng định dạng để so sánh chính xác. */
export function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/** Chuyển kết quả conflict của repository thành HTTP 409 phù hợp. */
export function throwIfConflicted(conflicts: ShiftConflicts): void {
  if (conflicts.doctorConflicts.length > 0) {
    throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.DOCTOR_CONFLICT);
  }
  if (conflicts.roomConflicts.length > 0) {
    throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.ROOM_CONFLICT);
  }
}

/** Kiểm tra khoảng ngày dùng cho API tìm kiếm. */
export function validateDateRange(dateFrom?: string, dateTo?: string): void {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.DATE_RANGE_INVALID);
  }
}

/** Lấy ngày hiện tại theo UTC+7 dưới dạng YYYY-MM-DD. */
export function todayInVietnam(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Lấy thứ Hai của tuần hiện tại. */
export function currentWeekStart(): string {
  const now = new Date(`${todayInVietnam()}T00:00:00Z`);
  const day = now.getUTCDay() || 7;
  now.setUTCDate(now.getUTCDate() - day + 1);
  return now.toISOString().slice(0, 10);
}

/** Khoảng duy nhất được phép tạo lịch mới: thứ Hai đến Chủ nhật của tuần kế tiếp. */
export function nextWeekPlanningRange(): { start: string; end: string } {
  const start = addDays(currentWeekStart(), 7);
  return { start, end: addDays(start, 6) };
}

/** Khoảng tạo một ca: từ ngày mai đến hết Chủ nhật của tuần kế tiếp. */
export function singleShiftCreateRange(): { start: string; end: string } {
  return {
    start: addDays(todayInVietnam(), 1),
    end: nextWeekPlanningRange().end,
  };
}

/** Chặn API tạo một ca nằm ngoài ngày mai đến Chủ nhật tuần kế tiếp. */
export function validateShiftCreateWeek(shiftDate: string): void {
  const { start, end } = singleShiftCreateRange();
  if (shiftDate < start || shiftDate > end) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.CREATE_WEEK_INVALID);
  }
}

/** Bulk phải tạo trọn đúng một tuần kế tiếp, không nhận khoảng tùy ý. */
export function validateBulkCreateWeek(fromDate: string, toDate: string): void {
  const { start, end } = nextWeekPlanningRange();
  if (fromDate !== start || toDate !== end) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_CREATE_WEEK_INVALID);
  }
}

/** Cộng số ngày mà không phụ thuộc timezone của máy chạy backend. */
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Tính số ngày giữa hai ngày, không phụ thuộc timezone
export function dateDiffInDays(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`).getTime();
  const to = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export function workingDayOf(date: string): ShiftWorkingDay {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return [
    ShiftWorkingDay.SUN,
    ShiftWorkingDay.MON,
    ShiftWorkingDay.TUE,
    ShiftWorkingDay.WED,
    ShiftWorkingDay.THU,
    ShiftWorkingDay.FRI,
    ShiftWorkingDay.SAT,
  ][day];
}

// Xây dựng danh sách các ngày làm việc trong khoảng thời gian cho trước
export function buildShiftDates(
  fromDate: string,
  toDate: string,
  workingDays: ShiftWorkingDay[],
): string[] {
  // tính số ngày
  const diff = dateDiffInDays(fromDate, toDate);
  // tạo mảng các ngày từ fromDate đến toDate,
  // sau đó lọc ra những ngày mà thứ của nó nằm trong workingDays
  // const dates: string[] = [];
  // // lặp qua từng ngày trong khoảng từ fromDate đến toDate
  // for (let i = 0; i <= diff; i++) {
  //   const date = addDays(fromDate, i);
  //   if (workingDays.includes(workingDayOf(date))) {
  //     dates.push(date);
  //   }
  // }
  // return dates;
  // (_, index) => addDays(fromDate, index): tạo một mảng các ngày từ fromDate đến toDate
  return Array.from({ length: diff + 1 }, (_, index) => addDays(fromDate, index)).filter((date) =>
    workingDays.includes(workingDayOf(date)),
  );
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = normalizeTime(value).split(':').map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(value: number): string {
  const normalizedValue = ((value % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const hour = Math.floor(normalizedValue / 60)
    .toString()
    .padStart(2, '0');
  const minute = (normalizedValue % 60).toString().padStart(2, '0');
  return `${hour}:${minute}:00`;
}

// Kiểm tra hai khoảng thời gian có overlap nhau hay không, không quan tâm ngày
export function isOvernightRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) <= timeToMinutes(startTime);
}

// lấy khoảng thời gian làm việc bằng phút 
export function getTimeRangeDurationMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) end += DAY_MINUTES;
  return end - start;
}

export function getTimeRangeEndMinute(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) end += DAY_MINUTES;
  return end;
}

// Chuyển đổi khoảng thời gian thành các đoạn thời gian trong ngày
function toDayTimeSegments(startTime: string, endTime: string): Array<{ start: number; end: number }> {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) {
    return [
      { start, end: DAY_MINUTES },
      { start: 0, end },
    ];
  }
  return [{ start, end }];
}

//trả về true nếu hai khoảng thời gian overlap nhau, ngược lại trả về false
export function timesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  const firstSegments = toDayTimeSegments(firstStart, firstEnd);
  const secondSegments = toDayTimeSegments(secondStart, secondEnd);
  return firstSegments.some(first =>
    secondSegments.some(second => first.start < second.end && first.end > second.start),
  );
}

export function shiftIntervalsOverlap(
  firstDate: string,
  firstStart: string,
  firstEnd: string,
  secondDate: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  //firstDateOffset: số phút từ 1970-01-01 đến firstDate
  //tại sao lại là 1970: vì 1970 là mốc thời gian chuẩn của Unix,
  //  và chúng ta cần một mốc thời gian để tính toán số phút từ đó đến ngày hiện tại.
  //  Việc sử dụng 1970-01-01 giúp đảm bảo rằng các phép tính về thời gian sẽ chính xác
  //  và không bị ảnh hưởng bởi các yếu tố khác như múi giờ hay ngày tháng.
  const firstDateOffset = dateDiffInDays('1970-01-01', firstDate) * DAY_MINUTES;
  
  const secondDateOffset = dateDiffInDays('1970-01-01', secondDate) * DAY_MINUTES;
  //firstStartAbsolute: số phút từ 1970-01-01 đến firstDate + firstStart
  //overlap là khi firstStartAbsolute < secondEndAbsolute 
  // và firstEndAbsolute > secondStartAbsolute, 
  // cụ thể hơn là 
  //cái này dùng để so sánh với secondStartAbsolute và secondEndAbsolute để xem có overlap hay không
  const firstStartAbsolute = firstDateOffset + timeToMinutes(firstStart);

  let firstEndAbsolute = firstDateOffset + timeToMinutes(firstEnd);
  if (firstEndAbsolute <= firstStartAbsolute) firstEndAbsolute += DAY_MINUTES;

  const secondStartAbsolute = secondDateOffset + timeToMinutes(secondStart);
  let secondEndAbsolute = secondDateOffset + timeToMinutes(secondEnd);
  if (secondEndAbsolute <= secondStartAbsolute) secondEndAbsolute += DAY_MINUTES;

  //
  return firstStartAbsolute < secondEndAbsolute && firstEndAbsolute > secondStartAbsolute;
}

export function dateTimeToTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  return `${hour}:${minute}:${second}`;
}

/** Chan viec dung API bulk cho khoang qua ngan; tao hang loat toi thieu phai tu 7 ngay tro len. */
export function validateBulkCreateRangeLength(fromDate: string, toDate: string): void {
  const totalDays = dateDiffInDays(fromDate, toDate) + 1;
  if (totalDays < 7) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_RANGE_TOO_SHORT);
  }
}

/**
 * Chuan hoa khoang ngay cho cac API tao hang loat:
 * - Neu FE khong gui fromDate, backend lay ngay hien tai theo gio Viet Nam.
 * - FE gui 1 trong 2 kieu: toDate thu cong hoac durationDays.
 * - durationDays tinh inclusive: 7 ngay tu 2026-07-25 se ket thuc 2026-07-31.
 */
export function resolveBulkCreateDateRange(input: BulkCreateDateRangeInput): {
  fromDate: string;
  toDate: string;
} {
  const fromDate = input.fromDate ?? todayInVietnam();
  const hasToDate = input.toDate !== undefined && input.toDate !== null;
  const hasDurationDays = input.durationDays !== undefined && input.durationDays !== null;

  if (!hasToDate && !hasDurationDays) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_RANGE_REQUIRED);
  }

  if (hasToDate && hasDurationDays) {
    throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_RANGE_AMBIGUOUS);
  }

  if (hasToDate) {
    return { fromDate, toDate: input.toDate as string };
  }

  return { fromDate, toDate: addDays(fromDate, (input.durationDays as number) - 1) };
}
