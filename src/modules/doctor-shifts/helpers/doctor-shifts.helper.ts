import { BadRequestException, ConflictException } from '@nestjs/common';
import { DoctorShiftStatus } from '../../../common/constants/status.enum';
import { DOCTOR_SHIFT_CONSTANT } from '../../../common/constants/doctor-shift.constant';
import { Facility } from '../../facilities/entities/facility.entity';
import { ShiftConflicts } from '../interfaces/shift-conflicts.interface';
import { ShiftWorkingDay } from '../dto/requests/bulk-create-doctor-shift.dto';

/** Kiểm tra id nhận từ path trước khi truy vấn database. */
export function validateShiftId(id: string): void {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new BadRequestException('shiftId phải là số nguyên dương');
  }
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
  if (normalizedStart >= normalizedEnd) {
    throw new BadRequestException('endTime phải muộn hơn startTime');
  }
  const [startHour, startMinute] = normalizedStart.split(':').map(Number);
  const [endHour, endMinute] = normalizedEnd.split(':').map(Number);
  const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (duration < 15 || duration > 12 * 60) {
    throw new BadRequestException('Thời lượng ca trực phải từ 15 phút đến 12 giờ');
  }
  if (requireFuture && shiftDate < todayInVietnam()) {
    throw new BadRequestException('Không thể tạo hoặc kiểm tra ca trực trong quá khứ');
  }
}

/** Ca nghỉ không sử dụng phòng khám. */
export function validateStatusDetails(
  status: DoctorShiftStatus,
  roomId?: string | null,
): void {
  if (status === DoctorShiftStatus.OFF && roomId) {
    throw new BadRequestException('Ca off không được gán phòng');
  }
}

/** Đảm bảo ca làm việc nằm trong giờ mở cửa của facility. */
export function validateFacilityHours(
  facility: Facility,
  startTime: string,
  endTime: string,
  status: DoctorShiftStatus,
): void {
  if (status === DoctorShiftStatus.OFF || status === DoctorShiftStatus.CANCELLED) return;
  const openTime = facility.open_time ? normalizeTime(String(facility.open_time)) : null;
  const closeTime = facility.close_time ? normalizeTime(String(facility.close_time)) : null;
  const normalizedStart = normalizeTime(startTime);
  const normalizedEnd = normalizeTime(endTime);
  if (openTime && closeTime && (normalizedStart < openTime || normalizedEnd > closeTime)) {
    throw new BadRequestException(
      `Ca trực phải nằm trong giờ hoạt động của cơ sở (${openTime} - ${closeTime})`,
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
    throw new ConflictException(DOCTOR_SHIFT_CONSTANT.DOCTOR_CONFLICT);
  }
  if (conflicts.roomConflicts.length > 0) {
    throw new ConflictException(DOCTOR_SHIFT_CONSTANT.ROOM_CONFLICT);
  }
}



/** Kiểm tra khoảng ngày dùng cho API tìm kiếm. */
export function validateDateRange(dateFrom?: string, dateTo?: string): void {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new BadRequestException('dateFrom phải sớm hơn hoặc bằng dateTo');
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
  return Array.from({ length: diff + 1 }, (_, index) => addDays(fromDate, index))
    .filter(date => workingDays.includes(workingDayOf(date)));
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = normalizeTime(value).split(':').map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(value: number): string {
  const hour = Math.floor(value / 60).toString().padStart(2, '0');
  const minute = (value % 60).toString().padStart(2, '0');
  return `${hour}:${minute}:00`;
}

//trả về true nếu hai khoảng thời gian overlap nhau, ngược lại trả về false
export function timesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  return normalizeTime(firstStart) < normalizeTime(secondEnd)
    && normalizeTime(firstEnd) > normalizeTime(secondStart);
}

export function dateTimeToTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  return `${hour}:${minute}:${second}`;
}

