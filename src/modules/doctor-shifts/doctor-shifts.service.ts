import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DOCTOR_SHIFT_CONSTANT } from '../../common/constants/doctor-shift.constant';
import { DoctorShiftStatus } from '../../common/constants/status.enum';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { DoctorShift } from './entities/doctor-shifts.entity';
import { BulkCreateDoctorShiftDto } from './dto/requests/bulk-create-doctor-shift.dto';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { CopyWeekDoctorShiftDto } from './dto/requests/copy-week-doctor-shift.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { DoctorAvailabilityQueryDto } from './dto/requests/doctor-availability.dto';
import { SearchDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import {
  addDays,
  buildShiftDates,
  dateDiffInDays,
  dateTimeToTime,
  minutesToTime,
  timeToMinutes,
  timesOverlap,
  validateDateRange,
  validateShiftId,
} from './helpers/doctor-shifts.helper';
import {
  DOCTOR_SHIFTS_REPOSITORY,
  DoctorShiftWithDetails,
  IDoctorShiftsRepository,
} from './interfaces/doctor-shifts-repository.interface';
import { DoctorShiftsValidator } from './validators/doctor-shifts.validator';

/**
 * Service chính chỉ giữ các use case mà controller gọi.
 * Validation chi tiết nằm trong DoctorShiftsValidator và doctor-shifts.helper.ts.
 */
@Injectable()
export class DoctorShiftsService {
  constructor(
    @Inject(DOCTOR_SHIFTS_REPOSITORY)
    private readonly repository: IDoctorShiftsRepository,
    private readonly validator: DoctorShiftsValidator,
  ) {}

  async create(dto: CreateDoctorShiftDto): Promise<DoctorShift> {
    await this.validator.validateForCreate(dto);
    return this.repository.save(this.repository.create(dto));
  }

  async bulkCreate(dto: BulkCreateDoctorShiftDto): Promise<DoctorShift[]> {
    validateDateRange(dto.fromDate, dto.toDate);
    const dates = buildShiftDates(dto.fromDate, dto.toDate, dto.workingDays);
    if (dates.length === 0) {
      throw new BadRequestException('Không có ngày nào khớp với workingDays trong khoảng đã chọn');
    }
    if (dateDiffInDays(dto.fromDate, dto.toDate) > 92) {
      throw new BadRequestException('Chỉ được tạo ca hàng loạt tối đa trong 92 ngày mỗi lần');
    }

    const payloads = dates.map(shiftDate => ({
      doctorId: dto.doctorId,
      facilityId: dto.facilityId,
      roomId: dto.roomId,
      shiftDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      maxAppointments: dto.maxAppointments,
      status: dto.status,
    })) as CreateDoctorShiftDto[];

    for (const payload of payloads) {
      await this.validator.validateForCreate(payload);
    }

    return this.repository.saveMany(payloads.map(payload => this.repository.create(payload)));
  }

  async findAll(filters?: SearchDoctorShiftDto): Promise<DoctorShiftWithDetails[]> {
    validateDateRange(filters?.dateFrom, filters?.dateTo);
    const shifts = await this.repository.findAll(filters);
    this.ensureShiftsFound(shifts);
    return shifts;
  }

  async findAllPaginated(filters?: SearchDoctorShiftDto) {
    validateDateRange(filters?.dateFrom, filters?.dateTo);
    const result = await this.repository.findAllPaginated(filters);
    this.ensureShiftsFound(result.items);
    return result;
  }

  async findById(id: string): Promise<DoctorShift> {
    validateShiftId(id);
    const shift = await this.repository.findById(id);
    if (!shift) throw new NotFoundException(DOCTOR_SHIFT_CONSTANT.NOT_FOUND);
    return shift;
  }

  async findDetailsById(id: string): Promise<DoctorShiftWithDetails> {
    validateShiftId(id);
    const shift = await this.repository.findDetailsById(id);
    if (!shift) throw new NotFoundException(DOCTOR_SHIFT_CONSTANT.NOT_FOUND);
    return shift;
  }

  async update(id: string, dto: UpdateDoctorShiftDto): Promise<DoctorShift> {
    const shift = await this.findById(id);
    // Merged: tạo một đối tượng mới bằng cách kết hợp các thuộc tính của shift và dto.
    
    const merged = { ...shift, ...dto } as DoctorShift;
    await this.validator.validateForUpdate(merged);
    Object.assign(shift, dto);
    return this.repository.save(shift);
  }

  async remove(id: string, reason?: string, deletedBy?: string | null): Promise<SafeRemoveResult> {
    const shift = await this.findById(id);
    const relatedAppointments = await this.repository.findAppointmentsForShift(shift);
    if (relatedAppointments.length === 0) {
      await this.repository.remove(shift);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    const activeAffectedAppointments = await this.repository.findAppointmentsForShift(shift, true);
    const result = await this.repository.cancelShiftWithDisruption(
      shift,
      activeAffectedAppointments,
      reason,
      deletedBy,
    );
    return {
      action: 'cancelled',
      affectedCount: activeAffectedAppointments.length,
      disruptionId: result.disruptionId,
    };
  }

  async checkConflicts(dto: CheckShiftConflictDto) {
    await this.validator.validateForConflictCheck(dto);
    const conflicts = await this.repository.findConflicts(dto);
    return {
      hasConflict: conflicts.doctorConflicts.length > 0 || conflicts.roomConflicts.length > 0,
      // ...: spread operator: dùng để sao chép tất cả các thuộc tính của một đối tượng vào một đối tượng khác.
      // Trong trường hợp này, nó được sử dụng để sao chép tất cả 
      // các thuộc tính của đối tượng conflicts vào đối tượng mới được trả về.
      ...conflicts,
    };
  }

  async copyWeek(dto: CopyWeekDoctorShiftDto): Promise<DoctorShift[]> {
    if (dto.sourceWeekStart === dto.targetWeekStart) {
      throw new BadRequestException('targetWeekStart phải khác sourceWeekStart');
    }

    await this.validator.prepareWeeklyRange(dto.facilityId, dto.sourceWeekStart, dto.doctorId);
    const sourceEnd = addDays(dto.sourceWeekStart, 6);
    const dayOffset = dateDiffInDays(dto.sourceWeekStart, dto.targetWeekStart);
    const sourceShifts = await this.repository.findWeekly(
      dto.facilityId,
      dto.sourceWeekStart,
      sourceEnd,
      dto.doctorId,
    );
    const copyableShifts = sourceShifts.filter(shift => shift.status !== DoctorShiftStatus.CANCELLED);
    if (copyableShifts.length === 0) return [];

    const payloads = copyableShifts.map(shift => ({
      doctorId: shift.doctorId,
      facilityId: shift.facilityId,
      roomId: shift.roomId,
      shiftDate: addDays(shift.shiftDate, dayOffset),
      startTime: shift.startTime,
      endTime: shift.endTime,
      maxAppointments: shift.maxAppointments,
      status: shift.status === DoctorShiftStatus.FULL
        ? DoctorShiftStatus.AVAILABLE
        : shift.status,
    })) as CreateDoctorShiftDto[];

    for (const payload of payloads) {
      await this.validator.validateForCreate(payload);
    }

    return this.repository.saveMany(payloads.map(payload => this.repository.create(payload)));
  }

  async getDoctorAvailability(doctorId: string, query: DoctorAvailabilityQueryDto) {
    validateShiftId(doctorId);
    await this.validator.validateDoctorAvailabilityInput(doctorId, query);

    const slotMinutes = query.slotMinutes ?? 60;
    const [shifts, appointments] = await Promise.all([
      this.repository.findDoctorShiftsForDate(query.facilityId, doctorId, query.date),
      this.repository.findDoctorAppointmentsForDate(query.facilityId, doctorId, query.date),
    ]);
    this.ensureShiftsFound(shifts);

    return {
      doctorId,
      facilityId: query.facilityId,
      date: query.date,
      slotMinutes,
      shifts: shifts.map(shift => {
        const appointmentBlocks = appointments.filter(appointment => timesOverlap(
          shift.startTime,
          shift.endTime,
          dateTimeToTime(appointment.scheduledStart),
          dateTimeToTime(appointment.scheduledEnd),
        ));
        const fullyBookedByLimit = Boolean(
          shift.maxAppointments && appointmentBlocks.length >= shift.maxAppointments,
        );
        const canGenerateSlots = shift.status === DoctorShiftStatus.AVAILABLE && !fullyBookedByLimit;

        return {
          shiftId: shift.id,
          roomId: shift.roomId,
          startTime: shift.startTime,
          endTime: shift.endTime,
          status: shift.status,
          maxAppointments: shift.maxAppointments,
          bookedAppointments: appointmentBlocks.length,
          availableSlots: canGenerateSlots
            ? this.buildAvailableSlots(shift, appointmentBlocks, slotMinutes)
            : [],
        };
      }),
    };
  }

  async getWeeklySchedule(facilityId: string, weekStart?: string, doctorId?: string) {
    const { start, end } = await this.validator.prepareWeeklyRange(
      facilityId,
      weekStart,
      doctorId,
    );
    const shifts = await this.repository.findWeeklyWithDetails(facilityId, start, end, doctorId);
    this.ensureShiftsFound(shifts);
    return {
      facilityId,
      weekStart: start,
      weekEnd: end,
      days: Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        return { date, shifts: shifts.filter(shift => shift.shiftDate === date) };
      }),
    };
  }

  private buildAvailableSlots(
    shift: DoctorShift,
    appointmentBlocks: { scheduledStart: Date | string; scheduledEnd: Date | string }[],
    slotMinutes: number,
  ) {
    const shiftStart = timeToMinutes(shift.startTime);
    const shiftEnd = timeToMinutes(shift.endTime);
    const slots: { startTime: string; endTime: string }[] = [];

    for (let start = shiftStart; start + slotMinutes <= shiftEnd; start += slotMinutes) {
      const end = start + slotMinutes;
      const startTime = minutesToTime(start);
      const endTime = minutesToTime(end);
      const isBooked = appointmentBlocks.some(appointment => timesOverlap(
        startTime,
        endTime,
        dateTimeToTime(appointment.scheduledStart),
        dateTimeToTime(appointment.scheduledEnd),
      ));
      if (!isBooked) slots.push({ startTime, endTime });
    }

    return slots;
  }

  private ensureShiftsFound(shifts?: unknown[] | null): void {
    if (!shifts || shifts.length === 0) {
      throw new NotFoundException(DOCTOR_SHIFT_CONSTANT.NOT_FOUND);
    }
  }

  
}


