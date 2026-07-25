import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { DoctorShiftStatus } from '../../common/constants/status.enum';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { DoctorShift } from './entities/shift.entity';
import { AutoGenerateShiftsDto } from './dto/requests/auto-generate-shifts.dto';
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
  resolveBulkCreateDateRange,
  timeToMinutes,
  timesOverlap,
  validateBulkCreateRangeLength,
  validateDateRange,
  validateShiftId,
} from './helpers/shifts.helper';
import {
  SHIFTS_REPOSITORY,
  ShiftWithDetails,
  IShiftsRepository,
} from './interfaces/shifts-repository.interface';
import {
  AutoGenerateIssueItem,
  AutoGenerateConfirmResult,
  AutoGeneratePlan,
  AutoGeneratePreviewResult,
  AutoGenerateValidItem,
} from './interfaces/auto-generate-shifts.interface';
import { ShiftsValidator, PreparedDoctorShiftInput } from './validators/shifts.validator';

/**
 * Service chính của ca trực bác sĩ.
 * Controller gọi vào đây; service điều phối use case, validator xử lý luật nghiệp vụ, repository xử lý DB.
 */
@Injectable()
export class ShiftsService {
  constructor(
    @Inject(SHIFTS_REPOSITORY)
    private readonly repository: IShiftsRepository,
    private readonly validator: ShiftsValidator,
  ) {}

  /** Tạo 1 ca trực bác sĩ; API nhận doctorId nhưng DB lưu staffId để sau này mở rộng cho role khác. */
  async create(dto: CreateDoctorShiftDto): Promise<DoctorShift> {
    const prepared = await this.validator.validateForCreate(dto);
    return this.repository.save(this.buildShiftEntity(dto, prepared));
  }

  /** Tạo nhiều ca theo khoảng ngày + workingDays, ví dụ tạo ca thứ 2/4/6 trong 1 tháng. */
  async bulkCreate(dto: BulkCreateDoctorShiftDto): Promise<DoctorShift[]> {
    const range = resolveBulkCreateDateRange(dto);
    validateDateRange(range.fromDate, range.toDate);
    validateBulkCreateRangeLength(range.fromDate, range.toDate);

    const dates = buildShiftDates(range.fromDate, range.toDate, dto.workingDays);
    if (dates.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_NO_MATCHING_DATE);
    }
    if (dateDiffInDays(range.fromDate, range.toDate) > 92) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_RANGE_TOO_LONG);
    }

    const shifts: DoctorShift[] = [];
    for (const shiftDate of dates) {
      const payload = {
        doctorId: dto.doctorId,
        facilityId: dto.facilityId,
        roomId: dto.roomId,
        slotId: dto.slotId,
        shiftDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        maxAppointments: dto.maxAppointments,
        status: dto.status,
      } as CreateDoctorShiftDto;
      const prepared = await this.validator.validateForCreate(payload);
      shifts.push(this.buildShiftEntity(payload, prepared));
    }

    return this.repository.saveMany(shifts);
  }

  /** Preview auto-generate: sinh candidate theo ngay/slot nhung khong luu DB, tra ro valid/skip/conflict. */
  async previewAutoGenerate(dto: AutoGenerateShiftsDto): Promise<AutoGeneratePreviewResult> {
    const plan = await this.buildAutoGeneratePlan(dto);
    const { internalValidEntities: _internalValidEntities, ...response } = plan;
    return response;
  }

  /** Confirm auto-generate: chi luu cac candidate hop le trong preview, cac ngay loi van duoc tra ve trong summary. */
  async confirmAutoGenerate(dto: AutoGenerateShiftsDto): Promise<AutoGenerateConfirmResult> {
    const plan = await this.buildAutoGeneratePlan(dto);
    if (plan.internalValidEntities.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_NO_VALID_SHIFT);
    }

    if (dto.saveOnlyValid === false && (plan.skippedItems.length > 0 || plan.conflictItems.length > 0)) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_STRICT_HAS_ISSUES);
    }

    const createdShifts = await this.repository.saveMany(plan.internalValidEntities);
    const { internalValidEntities: _internalValidEntities, ...response } = plan;
    return {
      ...response,
      createdShifts,
    };
  }

  /** Lấy danh sách ca trực kèm thông tin join: facility, doctor, room, roomType, slot. */
  async findAll(filters?: SearchDoctorShiftDto): Promise<ShiftWithDetails[]> {
    validateDateRange(filters?.dateFrom, filters?.dateTo);
    const shifts = await this.repository.findAll(filters);
    this.ensureShiftsFound(shifts);
    return shifts;
  }

  /** Lấy danh sách ca trực có phân trang. */
  async findAllPaginated(filters?: SearchDoctorShiftDto) {
    validateDateRange(filters?.dateFrom, filters?.dateTo);
    const result = await this.repository.findAllPaginated(filters);
    this.ensureShiftsFound(result.items);
    return result;
  }

  /** Lấy entity ca trực theo id, dùng nội bộ cho update/remove. */
  async findById(id: string): Promise<DoctorShift> {
    validateShiftId(id);
    const shift = await this.repository.findById(id);
    if (!shift) throw new NotFoundException(RESPONSE_MESSAGES.SHIFTS.NOT_FOUND);
    return shift;
  }

  /** Lấy chi tiết ca trực theo id để trả API, có join thông tin cần cho FE hiển thị. */
  async findDetailsById(id: string): Promise<ShiftWithDetails> {
    validateShiftId(id);
    const shift = await this.repository.findDetailsById(id);
    if (!shift) throw new NotFoundException(RESPONSE_MESSAGES.SHIFTS.NOT_FOUND);
    return shift;
  }

  /** Cập nhật ca trực; nếu đổi doctorId thì resolve lại sang staffId trước khi lưu. */
  async update(id: string, dto: UpdateDoctorShiftDto): Promise<DoctorShift> {
    const shift = await this.findById(id);
    const timeWasProvided = Object.prototype.hasOwnProperty.call(dto, 'startTime')
      || Object.prototype.hasOwnProperty.call(dto, 'endTime');
    const slotWasProvided = Object.prototype.hasOwnProperty.call(dto, 'slotId');

    if (shift.slotId && timeWasProvided && !slotWasProvided) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.SLOT_LOCKED_TIME_CHANGE);
    }

    const targetFacilityId = dto.facilityId ?? shift.facilityId;
    const doctorId = dto.doctorId
      ?? await this.resolveDoctorIdForExistingShift(shift, targetFacilityId);
    if (!doctorId) {
      throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.DOCTOR_NOT_ASSIGNED);
    }

    const merged = this.repository.create({ ...shift, ...dto });
    const prepared = await this.validator.validateForUpdate(merged, doctorId, {
      slotWasProvided,
      timeWasProvided,
    });

    const { doctorId: _doctorId, ...shiftData } = dto;
    Object.assign(shift, shiftData, {
      staffId: prepared.staffId,
      slotId: prepared.slotId,
      startTime: prepared.startTime,
      endTime: prepared.endTime,
    });

    return this.repository.save(shift);
  }

  /**
   * Xóa ca trực an toàn:
   * - Không có appointment liên quan: hard delete.
   * - Có appointment liên quan: chuyển status cancelled, tạo disruption để xử lý bệnh nhân sau.
   */
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

  /** Kiểm tra xung đột bác sĩ/phòng trước khi FE cho người dùng lưu ca. */
  async checkConflicts(dto: CheckShiftConflictDto) {
    const prepared = await this.validator.validateForConflictCheck(dto);
    const conflicts = await this.repository.findConflicts({
      ...dto,
      staffId: prepared.staffId,
      slotId: prepared.slotId,
      startTime: prepared.startTime,
      endTime: prepared.endTime,
    });
    return {
      hasConflict: conflicts.doctorConflicts.length > 0 || conflicts.roomConflicts.length > 0,
      ...conflicts,
    };
  }

  /** Copy toàn bộ ca của 1 tuần sang tuần khác; ca FULL được copy thành AVAILABLE. */
  async copyWeek(dto: CopyWeekDoctorShiftDto): Promise<DoctorShift[]> {
    if (dto.sourceWeekStart === dto.targetWeekStart) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.COPY_WEEK_SAME_TARGET);
    }

    await this.validator.prepareWeeklyRange(dto.facilityId, dto.sourceWeekStart, dto.doctorId);
    const sourceEnd = addDays(dto.sourceWeekStart, 6);
    const dayOffset = dateDiffInDays(dto.sourceWeekStart, dto.targetWeekStart);
    const sourceShifts = await this.repository.findWeeklyWithDetails(
      dto.facilityId,
      dto.sourceWeekStart,
      sourceEnd,
      dto.doctorId,
    );
    const copyableShifts = sourceShifts.filter(shift => shift.status !== DoctorShiftStatus.CANCELLED);
    if (copyableShifts.length === 0) return [];

    const shifts: DoctorShift[] = [];
    for (const sourceShift of copyableShifts) {
      const payload = {
        doctorId: sourceShift.doctorId,
        facilityId: sourceShift.facilityId,
        roomId: sourceShift.roomId,
        slotId: sourceShift.slotId ?? undefined,
        shiftDate: addDays(sourceShift.shiftDate, dayOffset),
        startTime: sourceShift.slotId ? undefined : sourceShift.startTime,
        endTime: sourceShift.slotId ? undefined : sourceShift.endTime,
        maxAppointments: sourceShift.maxAppointments,
        status: sourceShift.status === DoctorShiftStatus.FULL
          ? DoctorShiftStatus.AVAILABLE
          : sourceShift.status,
      } as CreateDoctorShiftDto;
      const prepared = await this.validator.validateForCreate(payload);
      shifts.push(this.buildShiftEntity(payload, prepared));
    }

    return this.repository.saveMany(shifts);
  }

  /** Sinh các khung giờ còn trống để đặt lịch trong 1 ngày của bác sĩ. */
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

  /** Trả lịch tuần đã group theo ngày để FE render calendar dễ hơn. */
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

  /** Tạo entity lưu DB từ DTO public-facing và dữ liệu đã được validator chuẩn hóa. */
  /** Tao plan auto-generate dung chung cho preview va confirm de hai API khong lech logic. */
  private async buildAutoGeneratePlan(dto: AutoGenerateShiftsDto): Promise<AutoGeneratePlan> {
    const range = resolveBulkCreateDateRange(dto);
    validateDateRange(range.fromDate, range.toDate);
    validateBulkCreateRangeLength(range.fromDate, range.toDate);

    if (dateDiffInDays(range.fromDate, range.toDate) > 92) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_RANGE_TOO_LONG);
    }

    const dates = buildShiftDates(range.fromDate, range.toDate, dto.workingDays);
    if (dates.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_NO_MATCHING_DATE);
    }

    const closureDates = await this.validator.getActiveClosureDates(dto.facilityId, range.fromDate, range.toDate);
    const validShifts: AutoGenerateValidItem[] = [];
    const skippedItems: AutoGenerateIssueItem[] = [];
    const conflictItems: AutoGenerateIssueItem[] = [];
    const internalValidEntities: DoctorShift[] = [];

    for (const shiftDate of dates) {
      const payload = this.buildAutoGeneratePayload(dto, shiftDate);

      if (closureDates.has(shiftDate)) {
        skippedItems.push({
          shiftDate,
          reason: RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_CLOSURE_DAY,
          candidate: payload,
        });
        continue;
      }

      try {
        const prepared = await this.validator.prepareForCreate(payload);
        const candidate = this.buildAutoGenerateCandidate(payload, prepared);
        const conflicts = await this.repository.findConflicts({
          ...payload,
          staffId: prepared.staffId,
          slotId: prepared.slotId,
          startTime: prepared.startTime,
          endTime: prepared.endTime,
        });

        if (conflicts.doctorConflicts.length > 0 || conflicts.roomConflicts.length > 0) {
          conflictItems.push({
            shiftDate,
            reason: RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_CONFLICT,
            candidate,
            doctorConflicts: conflicts.doctorConflicts,
            roomConflicts: conflicts.roomConflicts,
          });
          continue;
        }

        validShifts.push(candidate);
        internalValidEntities.push(this.buildShiftEntity(payload, prepared));
      } catch (error) {
        skippedItems.push({
          shiftDate,
          reason: this.extractErrorMessage(error),
          candidate: payload,
        });
      }
    }

    return {
      canConfirm: validShifts.length > 0,
      summary: {
        totalCandidates: dates.length,
        valid: validShifts.length,
        skipped: skippedItems.length,
        conflicted: conflictItems.length,
      },
      validShifts,
      skippedItems,
      conflictItems,
      internalValidEntities,
    };
  }

  /** Chuyen payload auto-generate theo tung ngay thanh payload create shift binh thuong. */
  private buildAutoGeneratePayload(dto: AutoGenerateShiftsDto, shiftDate: string): CreateDoctorShiftDto {
    return {
      doctorId: dto.doctorId,
      facilityId: dto.facilityId,
      roomId: dto.roomId,
      slotId: dto.slotId ?? undefined,
      shiftDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      maxAppointments: dto.maxAppointments,
      status: dto.status,
    } as CreateDoctorShiftDto;
  }

  /** Response candidate gom ca gio da resolve tu slotId de FE biet chinh xac ca nao se duoc tao. */
  private buildAutoGenerateCandidate(
    payload: CreateDoctorShiftDto,
    prepared: PreparedDoctorShiftInput,
  ): AutoGenerateValidItem {
    return {
      doctorId: payload.doctorId,
      facilityId: payload.facilityId,
      roomId: payload.roomId ?? null,
      slotId: prepared.slotId,
      staffId: prepared.staffId,
      shiftDate: payload.shiftDate,
      startTime: prepared.startTime,
      endTime: prepared.endTime,
      maxAppointments: payload.maxAppointments,
      status: payload.status,
    };
  }

  /** Lay message ngan gon tu Nest exception hoac Error thuong de dua vao skippedItems. */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as { message?: unknown }).message;
        return Array.isArray(message) ? message.join('; ') : String(message);
      }
    }

    return error instanceof Error ? error.message : RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_CANDIDATE_FAILED;
  }

  private buildShiftEntity(
    dto: CreateDoctorShiftDto,
    prepared: PreparedDoctorShiftInput,
  ): DoctorShift {
    const { doctorId: _doctorId, ...shiftData } = dto;
    return this.repository.create({
      ...shiftData,
      staffId: prepared.staffId,
      slotId: prepared.slotId,
      startTime: prepared.startTime,
      endTime: prepared.endTime,
    });
  }

  /** Fallback cho update: repository thật map staffId -> doctorId, còn mock cũ có thể chưa có method này. */
  private async resolveDoctorIdForExistingShift(shift: DoctorShift, facilityId: string): Promise<string | null> {
    const repository = this.repository as IShiftsRepository & {
      findDoctorIdByStaffId?: (staffId: string, facilityId?: string) => Promise<string | null>;
    };
    if (repository.findDoctorIdByStaffId) {
      return repository.findDoctorIdByStaffId(shift.staffId ?? shift.doctorId, facilityId);
    }
    return shift.doctorId ?? shift.staffId ?? null;
  }

  /** Tách một ca 08:00-11:00 thành các slot appointment nhỏ, ví dụ mỗi slot 30/60 phút. */
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

  /** Các API list/weekly/availability phải báo 404 khi không có ca nào phù hợp. */
  private ensureShiftsFound(shifts?: unknown[] | null): void {
    if (!shifts || shifts.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.SHIFTS.NOT_FOUND);
    }
  }
}
