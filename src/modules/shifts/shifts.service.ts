import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { DoctorShiftStatus } from '../../common/constants/status.enum';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { DoctorShift } from './entities/shift.entity';
import { AutoGenerateShiftsDto } from './dto/requests/auto-generate-shifts.dto';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { CopyWeekDoctorShiftDto } from './dto/requests/copy-week-doctor-shift.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { DoctorAvailabilityQueryDto } from './dto/requests/doctor-availability.dto';
import { GroupedDoctorShiftDto, SearchDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import {
  addDays,
  buildShiftDates,
  dateDiffInDays,
  dateTimeToTime,
  getTimeRangeEndMinute,
  minutesToTime,
  resolveBulkCreateDateRange,
  shiftIntervalsOverlap,
  timeToMinutes,
  timesOverlap,
  validateBulkCreateRangeLength,
  validateDateRange,
  validateShiftId,
} from './helpers/shifts.helper';
import { roleOccupiesPrimaryRoom } from './helpers/shift-role-policy.helper';
import {
  SHIFTS_REPOSITORY,
  ShiftWithDetails,
  IShiftsRepository,
} from './interfaces/shifts-repository.interface';
import {
  AutoGenerateIssueItem,
  AutoGenerateConfirmResult,
  AutoGenerateCandidate,
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

  /** Preview bulk-generate: sinh candidate theo ngay/slot nhung khong luu DB, tra ro valid/skip/conflict. */
  async previewBulkGenerate(dto: AutoGenerateShiftsDto): Promise<AutoGeneratePreviewResult> {
    const plan = await this.buildAutoGeneratePlan(dto);
    const { internalValidEntities: _internalValidEntities, ...response } = plan;
    return response;
  }

  /**
   * Confirm bulk-generate la API mot buoc cho FE:
   * - Tu validate/preview lai day du.
   * - saveOnlyValid=true: luu cac dong hop le, dong loi van tra ve skipped/conflict.
   * - saveOnlyValid=false: neu con bat ky loi nao thi khong luu dong nao, nhung van tra ve bang loi.
   */
  async confirmBulkGenerate(dto: AutoGenerateShiftsDto): Promise<AutoGenerateConfirmResult> {
    const plan = await this.buildAutoGeneratePlan(dto);
    const { internalValidEntities: _internalValidEntities, ...response } = plan;
    const hasIssues = plan.skippedItems.length > 0 || plan.conflictItems.length > 0;

    if (plan.internalValidEntities.length === 0 || (dto.saveOnlyValid === false && hasIssues)) {
      return {
        ...response,
        canConfirm: false,
        createdShifts: [],
        createdCount: 0,
        allOrNothingRejected: dto.saveOnlyValid === false && hasIssues,
      };
    }

    const createdShifts = await this.repository.saveMany(plan.internalValidEntities);
    return {
      ...response,
      createdShifts,
      createdCount: createdShifts.length,
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

  async findByIdForRemoval(id: string): Promise<DoctorShift> {
    validateShiftId(id);
    const shift = await this.repository.findByIdForRemoval(id);
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
      roleName: prepared.roleName,
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
    const shift = await this.findByIdForRemoval(id);
    const relatedAppointments = await this.repository.findAppointmentsForShift(shift);
    if (relatedAppointments.length === 0) {
      await this.repository.remove(shift);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    if (shift.status === DoctorShiftStatus.CANCELLED) {
      throw new ConflictException(
        'Ca truc da huy nhung van co lich hen lien quan, can xu ly lich hen bi anh huong truoc khi xoa cung.',
      );
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
      roleName: prepared.roleName,
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
        const appointmentBlocks = appointments.filter(appointment =>
          this.appointmentOverlapsShift(shift, appointment),
        );
        // Quick booking đang đặt theo từng slot 30/60 phút. Nếu dùng maxAppointments
        // để chặn cả ca thì ca có maxAppointments=1 sẽ mất toàn bộ slot còn lại ngay
        // sau booking đầu tiên. Availability nên loại đúng slot bị overlap; capacity
        // của ca dùng để tham khảo/quản trị, không thay thế kiểm tra overlap theo giờ.
        const canGenerateSlots = shift.status === DoctorShiftStatus.AVAILABLE;

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

  async getGroupedSchedule(query: GroupedDoctorShiftDto) {
    validateDateRange(query.dateFrom, query.dateTo);
    const shifts = await this.repository.findAll({
      facilityId: query.facilityId,
      doctorId: query.doctorId,
      roomId: query.roomId,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    const groups = this.groupShiftsByPattern(shifts);

    return {
      facilityId: query.facilityId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      totalShifts: shifts.length,
      totalGroups: groups.length,
      groups,
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

    const closureDates = await this.validator.getActiveClosureDates(dto.facilityId, range.fromDate, range.toDate);
    const validShifts: AutoGenerateValidItem[] = [];
    const skippedItems: AutoGenerateIssueItem[] = [];
    const conflictItems: AutoGenerateIssueItem[] = [];
    const internalValidEntities: DoctorShift[] = [];
    const candidateInputs = this.buildAutoGenerateInputs(dto, range, skippedItems);
    const preValidationSkippedCount = skippedItems.length;

    for (const candidateInput of candidateInputs) {
      const { index, slotAssignmentIndex, assignmentIndex, shiftDate, payload } = candidateInput;

      if (closureDates.has(shiftDate)) {
        skippedItems.push({
          index,
          slotAssignmentIndex,
          assignmentIndex,
          shiftDate,
          reason: RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_CLOSURE_DAY,
          candidate: { ...payload, index, slotAssignmentIndex, assignmentIndex },
        });
        continue;
      }

      try {
        const prepared = await this.validator.prepareForCreate(payload);
        const candidate = this.buildAutoGenerateCandidate(payload, prepared, index, slotAssignmentIndex, assignmentIndex);
        // Kiem tra conflict voi cac ca da ton tai trong DB.
        // Buoc nay bat cac lich da duoc tao truoc do, nhung khong thay duoc cac ca dang nam trong cung payload bulk hien tai.
        const conflicts = await this.repository.findConflicts({
          ...payload,
          staffId: prepared.staffId,
          roleId: payload.roleId,
          roleName: prepared.roleName,
          slotId: prepared.slotId,
          startTime: prepared.startTime,
          endTime: prepared.endTime,
        });

        if (conflicts.doctorConflicts.length > 0 || conflicts.roomConflicts.length > 0) {
          conflictItems.push({
            index,
            slotAssignmentIndex,
            assignmentIndex,
            shiftDate,
            reason: RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_CONFLICT,
            candidate,
            doctorConflicts: conflicts.doctorConflicts,
            roomConflicts: conflicts.roomConflicts,
          });
          continue;
        }

        // Kiem tra conflict noi bo trong chinh lan bulk-generate nay.
        // Vi cac candidate hop le phia tren chua duoc save vao DB, repository.findConflicts khong the bat truong hop:
        // - cung bac si bi xep 2 ca giao nhau trong cung ngay
        // - hai bac si khac nhau bi xep vao cung phong, cung ngay, cung khung gio
        const internalConflicts = this.findInternalAutoGenerateConflicts(candidate, validShifts);
        if (internalConflicts.doctorConflicts.length > 0 || internalConflicts.roomConflicts.length > 0) {
          conflictItems.push({
            index,
            slotAssignmentIndex,
            assignmentIndex,
            shiftDate,
            reason: RESPONSE_MESSAGES.SHIFTS.AUTO_GENERATE_CONFLICT,
            candidate,
            doctorConflicts: internalConflicts.doctorConflicts,
            roomConflicts: internalConflicts.roomConflicts,
          });
          continue;
        }

        validShifts.push(candidate);
        internalValidEntities.push(this.buildShiftEntity(payload, prepared));
      } catch (error) {
        skippedItems.push({
          index,
          slotAssignmentIndex,
          assignmentIndex,
          shiftDate,
          reason: this.extractErrorMessage(error),
          candidate: { ...payload, index, slotAssignmentIndex, assignmentIndex },
        });
      }
    }
    const hasIssues = skippedItems.length > 0 || conflictItems.length > 0;

    return {
      canConfirm: validShifts.length > 0 && (dto.saveOnlyValid !== false || !hasIssues),
      summary: {
        totalCandidates: candidateInputs.length + preValidationSkippedCount,
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

  private findInternalAutoGenerateConflicts(
    candidate: AutoGenerateValidItem,
    existingShifts: AutoGenerateValidItem[],
  ): { doctorConflicts: AutoGenerateValidItem[]; roomConflicts: AutoGenerateValidItem[] } {
    // Conflict theo bac si: available/full/off deu chiem thoi gian cua nhan su.
    // OFF khong phai ca lam, nhung van co y nghia la bac si khong san sang trong khung gio do.
    const doctorConflictStatuses = [
      DoctorShiftStatus.AVAILABLE,
      DoctorShiftStatus.FULL,
      DoctorShiftStatus.OFF,
    ];
    // Conflict theo phong: chi available/full moi chiem phong.
    // OFF khong gan phong nen khong tinh vao xung dot phong.
    const roomConflictStatuses = [
      DoctorShiftStatus.AVAILABLE,
      DoctorShiftStatus.FULL,
    ];

    // Dung shiftIntervalsOverlap de xu ly ca giao nhau theo ngay + gio, ke ca truong hop ca qua dem.
    const overlapsCandidate = (shift: AutoGenerateValidItem) =>
      shiftIntervalsOverlap(
        candidate.shiftDate,
        candidate.startTime,
        candidate.endTime,
        shift.shiftDate,
        shift.startTime,
        shift.endTime,
      );

    const doctorConflicts = existingShifts.filter(shift =>
      shift.staffId === candidate.staffId &&
      doctorConflictStatuses.includes(shift.status) &&
      doctorConflictStatuses.includes(candidate.status) &&
      overlapsCandidate(shift),
    );

    const roomConflicts =
      candidate.roomId &&
      roomConflictStatuses.includes(candidate.status) &&
      roleOccupiesPrimaryRoom(candidate.roleName, candidate.status)
      ? existingShifts.filter(shift =>
        shift.roomId === candidate.roomId &&
        roomConflictStatuses.includes(shift.status) &&
        roleOccupiesPrimaryRoom(shift.roleName, shift.status) &&
        overlapsCandidate(shift),
      )
      : [];

    return { doctorConflicts, roomConflicts };
  }

  private buildAutoGenerateInputs(
    dto: AutoGenerateShiftsDto,
    range: { fromDate: string; toDate: string },
    skippedItems: AutoGenerateIssueItem[],
  ): Array<{
    index: number;
    slotAssignmentIndex?: number;
    assignmentIndex?: number;
    shiftDate: string;
    payload: CreateDoctorShiftDto;
  }> {
    const inputs: Array<{
      index: number;
      slotAssignmentIndex?: number;
      assignmentIndex?: number;
      shiftDate: string;
      payload: CreateDoctorShiftDto;
    }> = [];

    if (dto.slotAssignments?.length) {
      for (const [slotAssignmentIndex, slotAssignment] of dto.slotAssignments.entries()) {
        for (const [assignmentIndex, assignment] of slotAssignment.assignments.entries()) {
          const dates = buildShiftDates(range.fromDate, range.toDate, assignment.workingDays);
          if (dates.length === 0) {
            skippedItems.push({
              index: inputs.length + skippedItems.length,
              slotAssignmentIndex,
              assignmentIndex,
              shiftDate: range.fromDate,
              reason: RESPONSE_MESSAGES.SHIFTS.BULK_NO_MATCHING_DATE,
              candidate: {
                facilityId: dto.facilityId,
                slotId: slotAssignment.slotId,
                staffId: assignment.staffId,
                roleId: assignment.roleId,
                roomId: assignment.roomId ?? null,
                maxAppointments: assignment.maxAppointments,
                status: assignment.status,
              },
            });
            continue;
          }

          for (const shiftDate of dates) {
            inputs.push({
              index: inputs.length + skippedItems.length,
              slotAssignmentIndex,
              assignmentIndex,
              shiftDate,
              payload: {
                staffId: assignment.staffId,
                roleId: assignment.roleId,
                facilityId: dto.facilityId,
                roomId: assignment.roomId ?? undefined,
                slotId: slotAssignment.slotId,
                shiftDate,
                maxAppointments: assignment.maxAppointments,
                status: assignment.status,
              } as CreateDoctorShiftDto,
            });
          }
        }
      }

      return inputs;
    }

    const dates = buildShiftDates(range.fromDate, range.toDate, dto.workingDays ?? []);
    if (dates.length === 0) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.BULK_NO_MATCHING_DATE);
    }

    for (const shiftDate of dates) {
      inputs.push({
        index: inputs.length,
        shiftDate,
        payload: this.buildLegacyAutoGeneratePayload(dto, shiftDate),
      });
    }

    return inputs;
  }

  /** Chuyen payload auto-generate theo tung ngay thanh payload create shift binh thuong. */
  private buildLegacyAutoGeneratePayload(dto: AutoGenerateShiftsDto, shiftDate: string): CreateDoctorShiftDto {
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
    index: number,
    slotAssignmentIndex?: number,
    assignmentIndex?: number,
  ): AutoGenerateValidItem {
    return {
      index,
      slotAssignmentIndex,
      assignmentIndex,
      doctorId: payload.doctorId,
      facilityId: payload.facilityId,
      roomId: payload.roomId ?? null,
      slotId: prepared.slotId,
      staffId: prepared.staffId,
      roleId: payload.roleId ?? null,
      roleName: prepared.roleName,
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
    const shiftEnd = getTimeRangeEndMinute(shift.startTime, shift.endTime);
    const slots: { startTime: string; endTime: string }[] = [];

    for (let start = shiftStart; start + slotMinutes <= shiftEnd; start += slotMinutes) {
      const end = start + slotMinutes;
      const startTime = minutesToTime(start);
      const endTime = minutesToTime(end);
      const isBooked = appointmentBlocks.some(appointment => {
        const appointmentStart = dateTimeToTime(appointment.scheduledStart);
        const appointmentEnd = dateTimeToTime(appointment.scheduledEnd);
        if (appointmentStart === appointmentEnd) return false;

        return timesOverlap(
          startTime,
          endTime,
          appointmentStart,
          appointmentEnd,
        );
      });
      if (!isBooked) slots.push({ startTime, endTime });
    }

    return slots;
  }

  /** Các API list/weekly/availability phải báo 404 khi không có ca nào phù hợp. */
  private appointmentOverlapsShift(
    shift: DoctorShift,
    appointment: { scheduledStart: Date | string; scheduledEnd: Date | string },
  ): boolean {
    const appointmentStart = dateTimeToTime(appointment.scheduledStart);
    const appointmentEnd = dateTimeToTime(appointment.scheduledEnd);
    if (appointmentStart === appointmentEnd) return false;

    return shiftIntervalsOverlap(
      this.toDateOnly(shift.shiftDate),
      shift.startTime,
      shift.endTime,
      this.toDateOnly(appointment.scheduledStart),
      appointmentStart,
      appointmentEnd,
    );
  }

  private groupShiftsByPattern(shifts: ShiftWithDetails[]) {
    const sortedShifts = [...shifts].sort((left, right) => {
      const dateCompare = String(left.shiftDate).localeCompare(String(right.shiftDate));
      if (dateCompare !== 0) return dateCompare;
      return String(left.startTime).localeCompare(String(right.startTime));
    });
    const groups = new Map<string, ShiftWithDetails[]>();

    for (const shift of sortedShifts) {
      const key = this.buildShiftGroupKey(shift);
      groups.set(key, [...(groups.get(key) ?? []), shift]);
    }

    return Array.from(groups.values()).map((items, index) => {
      const dates = items.map(item => String(item.shiftDate));
      const workingDays = this.getOrderedWorkingDays(dates);

      return {
        groupIndex: index,
        workingDays,
        // Mỗi ca giữ nguyên toàn bộ field của GET /management/shifts.
        // FE dùng shifts[0] làm mẫu của nhóm và workingDays để tạo lịch tuần kế tiếp.
        shifts: items.map(item => ({
          ...item,
          workingDay: this.getWorkingDayFromDate(item.shiftDate),
        })),
      };
    });
  }

  private buildShiftGroupKey(shift: ShiftWithDetails): string {
    return JSON.stringify({
      facilityId: shift.facilityId,
      staffId: shift.staffId ?? null,
      doctorId: shift.doctorId ?? null,
      roleId: shift.roleId ?? null,
      roomId: shift.roomId ?? null,
      slotId: shift.slotId ?? null,
      startTime: shift.startTime,
      endTime: shift.endTime,
      maxAppointments: shift.maxAppointments ?? null,
      status: shift.status,
      note: shift.note ?? null,
    });
  }

  private getOrderedWorkingDays(dates: string[]): string[] {
    const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const uniqueDays = new Set(dates.map(date => this.getWorkingDayFromDate(date)));
    return order.filter(day => uniqueDays.has(day));
  }

  private getWorkingDayFromDate(date: string): string {
    const value = new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`);
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][value.getUTCDay()];
  }

  private toDateOnly(value: string | Date): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(value).slice(0, 10);
  }

  private ensureShiftsFound(shifts?: unknown[] | null): void {
    if (!shifts || shifts.length === 0) {
      throw new NotFoundException(RESPONSE_MESSAGES.SHIFTS.NOT_FOUND);
    }
  }
}
