import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { ActiveStatus, DoctorShiftStatus, FacilityStatus } from '../../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';
import { RoleEnum } from '../../../common/constants/role.enum';
import { Facility } from '../../facilities/entities/facility.entity';
import { FacilitiesService } from '../../facilities/facilities.service';
import { RoomsService } from '../../rooms/rooms.service';
import { DoctorShift } from '../entities/shift.entity';
import { CheckShiftConflictDto } from '../dto/requests/check-shift-conflict.dto';
import { CreateDoctorShiftDto } from '../dto/requests/create-doctor-shift.dto';
import { DoctorAvailabilityQueryDto } from '../dto/requests/doctor-availability.dto';
import {
  addDays,
  currentWeekStart,
  throwIfConflicted,
  validateFacilityHours,
  validateSchedule,
  validateShiftCreateWeek,
  validateStatusDetails,
  workingDayOf,
} from '../helpers/shifts.helper';
import {
  SHIFTS_REPOSITORY,
  IShiftsRepository,
  ShiftAssigneeDetails,
} from '../interfaces/shifts-repository.interface';
import { getShiftRolePolicy, roleRequiresRoom } from '../helpers/shift-role-policy.helper';

export interface PreparedDoctorShiftInput {
  staffId: string;
  roleName: string | null;
  slotId: string | null;
  startTime: string;
  endTime: string;
}

type OperatingHoursResult = Awaited<ReturnType<FacilitiesService['getOperatingHours']>>;
type RoomResult = Awaited<ReturnType<RoomsService['findById']>>;

interface BulkValidationCache {
  facilities: Map<string, Promise<Facility>>;
  assignees: Map<string, Promise<ShiftAssigneeDetails | null>>;
  doctorStaffIds: Map<string, Promise<string | null>>;
  rooms: Map<string, Promise<RoomResult>>;
  slots: Map<string, ReturnType<IShiftsRepository['findShiftSlotById']>>;
  operatingHours: Map<string, Promise<OperatingHoursResult>>;
}

/** Gom toàn bộ validation nghiệp vụ của shifts để service chính chỉ còn điều phối use case. */
@Injectable()
export class ShiftsValidator {
  constructor(
    @Inject(SHIFTS_REPOSITORY)
    private readonly repository: IShiftsRepository,
    private readonly facilitiesService: FacilitiesService,
    private readonly roomsService: RoomsService,
  ) {}

  /** Validate dữ liệu tạo ca và chuẩn hóa doctorId profile thành staffId thật để lưu vào bảng shifts. */
  async validateForCreate(dto: CreateDoctorShiftDto): Promise<PreparedDoctorShiftInput> {
    const prepared = await this.prepareForCreate(dto);

    throwIfConflicted(await this.repository.findConflicts({
      ...dto,
      staffId: prepared.staffId,
      roleName: prepared.roleName,
      slotId: prepared.slotId,
      startTime: prepared.startTime,
      endTime: prepared.endTime,
    }));

    return prepared;
  }

  /** Validate candidate tao ca nhung chua check conflict, dung cho preview auto-generate de tra conflict details. */
  async prepareForCreate(
    dto: CreateDoctorShiftDto,
    cache?: BulkValidationCache,
  ): Promise<PreparedDoctorShiftInput> {
    validateShiftCreateWeek(dto.shiftDate);
    const { facility, staffId, roleName } = await this.validateReferences(dto, dto.facilityId, dto.roomId, cache);
    const timing = await this.resolveShiftTiming(dto, true, undefined, cache);

    validateSchedule(dto.shiftDate, timing.startTime, timing.endTime, true);
    validateStatusDetails(dto.status, dto.roomId);
    this.validateRoomPolicy(roleName, dto.status, dto.roomId);
    await this.validateFacilityOperatingHours(
      facility.id,
      dto.shiftDate,
      timing.startTime,
      timing.endTime,
      dto.status,
      cache,
    );

    return { staffId, roleName, ...timing };
  }

  /** Chuan hoa nhieu candidate va tai moi reference chung chi mot lan trong pham vi request. */
  async prepareManyForCreate(
    dtos: CreateDoctorShiftDto[],
  ): Promise<PromiseSettledResult<PreparedDoctorShiftInput>[]> {
    const cache: BulkValidationCache = {
      facilities: new Map(),
      assignees: new Map(),
      doctorStaffIds: new Map(),
      rooms: new Map(),
      slots: new Map(),
      operatingHours: new Map(),
    };
    const results: PromiseSettledResult<PreparedDoctorShiftInput>[] = [];

    // Chay tuan tu de khong day hang loat truy van reference vao pool DB cung luc.
    // Cache van dam bao moi facility/staff/room/slot chi duoc doc mot lan khi thanh cong.
    for (const dto of dtos) {
      try {
        results.push({ status: 'fulfilled', value: await this.prepareForCreate(dto, cache) });
      } catch (reason) {
        results.push({ status: 'rejected', reason });
      }
    }

    return results;
  }

  /** Validate dữ liệu cập nhật ca, gồm cả trường hợp đổi slotId hoặc đổi giờ thủ công. */
  async validateForUpdate(
    shift: DoctorShift,
    doctorId: string,
    options?: { slotWasProvided?: boolean; timeWasProvided?: boolean },
  ): Promise<PreparedDoctorShiftInput> {
    const { facility, staffId, roleName } = await this.validateReferences({ ...shift, doctorId }, shift.facilityId, shift.roomId);
    const timing = await this.resolveShiftTiming(shift, false, options);

    validateSchedule(shift.shiftDate, timing.startTime, timing.endTime, false);
    validateStatusDetails(shift.status, shift.roomId);
    this.validateRoomPolicy(roleName, shift.status, shift.roomId);
    await this.validateFacilityOperatingHours(facility.id, shift.shiftDate, timing.startTime, timing.endTime, shift.status);

    if (shift.status !== DoctorShiftStatus.CANCELLED) {
      throwIfConflicted(await this.repository.findConflicts({
        doctorId,
        staffId,
        roleName,
        roomId: shift.roomId,
        shiftDate: shift.shiftDate,
        startTime: timing.startTime,
        endTime: timing.endTime,
        excludeShiftId: shift.id,
      }));
    }

    return { staffId, roleName, ...timing };
  }

  /** Validate input API check-conflict; nếu dùng slotId thì tự lấy start/end từ shift_slots. */
  async validateForConflictCheck(dto: CheckShiftConflictDto): Promise<PreparedDoctorShiftInput> {
    const { facility, staffId, roleName } = await this.validateReferences(dto, dto.facilityId, dto.roomId);
    const timing = await this.resolveShiftTiming(dto);

    validateSchedule(dto.shiftDate, timing.startTime, timing.endTime, true);
    this.validateRoomPolicy(roleName, DoctorShiftStatus.AVAILABLE, dto.roomId);
    await this.validateFacilityOperatingHours(facility.id, dto.shiftDate, timing.startTime, timing.endTime, DoctorShiftStatus.AVAILABLE);

    return { staffId, roleName, ...timing };
  }

  /** Kiểm tra bác sĩ thuộc cơ sở trước khi sinh danh sách slot đặt lịch. */
  async validateDoctorAvailabilityInput(
    doctorId: string,
    query: DoctorAvailabilityQueryDto,
  ): Promise<void> {
    await this.ensureActiveFacility(query.facilityId);
    if (!await this.repository.isDoctorAssignedToFacility(doctorId, query.facilityId)) {
      throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.DOCTOR_NOT_ASSIGNED);
    }
  }

  /** Chuẩn bị khoảng tuần và validate filter facility/doctor dùng cho weekly schedule/copy-week. */
  async prepareWeeklyRange(
    facilityId: string,
    weekStart?: string,
    doctorId?: string,
  ): Promise<{ start: string; end: string }> {
    await this.ensureActiveFacility(facilityId);
    if (doctorId && !await this.repository.isDoctorAssignedToFacility(doctorId, facilityId)) {
      throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.DOCTOR_NOT_ASSIGNED);
    }
    const start = weekStart ?? currentWeekStart();
    return { start, end: addDays(start, 6) };
  }

  /** Kiểm tra facility, doctor assignment, room; đồng thời trả staffId để lưu vào shifts.staff_id. */
  private async validateReferences(
    input: { doctorId?: string; staffId?: string; roleId?: string | null },
    facilityId: string,
    roomId?: string | null,
    cache?: BulkValidationCache,
  ): Promise<{ facility: Facility; staffId: string; roleName: string | null }> {
    const facility = await this.resolveCached(
      cache?.facilities,
      facilityId,
      () => this.ensureActiveFacility(facilityId),
    );

    if (input.staffId) {
      const assigneeKey = `${facilityId}:${input.staffId}:${input.roleId ?? ''}`;
      const assignee = await this.resolveCached(
        cache?.assignees,
        assigneeKey,
        () => this.repository.findShiftAssignee(input.staffId as string, facilityId, input.roleId),
      );
      if (!assignee) {
        throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.STAFF_ROLE_INVALID);
      }
      if (getShiftRolePolicy(assignee.roleName).requiresDoctorProfile && !assignee.doctorId) {
        throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.STAFF_DOCTOR_PROFILE_REQUIRED);
      }

      if (roomId) {
        const room = await this.resolveCached(cache?.rooms, roomId, () => this.roomsService.findById(roomId));
        if (room.facilityId !== facilityId || room.status !== ActiveStatus.ACTIVE) {
          throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.ROOM_INVALID);
        }
      }

      return { facility, staffId: assignee.staffId, roleName: assignee.roleName ?? null };
    }

    if (!input.doctorId) {
      throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.STAFF_OR_DOCTOR_REQUIRED);
    }

    const repository = this.repository as IShiftsRepository & {
      findDoctorStaffId?: (doctorId: string, facilityId?: string) => Promise<string | null>;
    };
    const doctorStaffKey = `${facilityId}:${input.doctorId}`;
    const staffId = await this.resolveCached(
      cache?.doctorStaffIds,
      doctorStaffKey,
      () => repository.findDoctorStaffId
        ? repository.findDoctorStaffId(input.doctorId as string, facilityId)
        : this.resolveStaffIdWithLegacyRepository(input.doctorId as string, facilityId),
    );
    if (!staffId) {
      throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.DOCTOR_NOT_ASSIGNED);
    }

    if (roomId) {
      const room = await this.resolveCached(cache?.rooms, roomId, () => this.roomsService.findById(roomId));
      if (room.facilityId !== facilityId || room.status !== ActiveStatus.ACTIVE) {
        throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.ROOM_INVALID);
      }
    }

    return { facility, staffId, roleName: RoleEnum.DOCTOR };
  }

  private validateRoomPolicy(roleName: string | null, status: DoctorShiftStatus, roomId?: string | null): void {
    if (roleRequiresRoom(roleName, status) && !roomId) {
      throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.ROOM_REQUIRED_FOR_ROLE);
    }
  }

  /** Fallback để các unit test/mock cũ vẫn chạy được trong lúc repository thật đã tách doctorId và staffId. */
  private async resolveStaffIdWithLegacyRepository(doctorId: string, facilityId: string): Promise<string | null> {
    const isAssigned = await this.repository.isDoctorAssignedToFacility(doctorId, facilityId);
    return isAssigned ? doctorId : null;
  }

  /** Nếu có slotId thì lấy giờ từ shift_slots; nếu không có slotId thì bắt buộc dùng giờ custom. */
  private async resolveShiftTiming(
    input: { slotId?: string | null; facilityId: string; shiftDate?: string; startTime?: string; endTime?: string },
    requireTimes = true,
    options?: { slotWasProvided?: boolean; timeWasProvided?: boolean },
    cache?: BulkValidationCache,
  ): Promise<{ slotId: string | null; startTime: string; endTime: string }> {
    const slotWasProvided = options?.slotWasProvided ?? Boolean(input.slotId);
    const timeWasProvided = options?.timeWasProvided ?? Boolean(input.startTime || input.endTime);

    if (slotWasProvided && input.slotId && timeWasProvided) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.SLOT_TIME_SENT_WITH_SLOT_ID);
    }

    if (input.slotId) {
      const slot = await this.resolveCached(
        cache?.slots,
        input.slotId,
        () => this.repository.findShiftSlotById(input.slotId as string),
      );
      if (!slot || slot.status !== ActiveStatus.ACTIVE) {
        throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.SLOT_INACTIVE_OR_NOT_FOUND);
      }
      if (slot.facilityId !== input.facilityId) {
        throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.SLOT_NOT_BELONG_TO_FACILITY);
      }
      if (input.shiftDate && Array.isArray(slot.applicableDays) && slot.applicableDays.length > 0) {
        const shiftWorkingDay = workingDayOf(input.shiftDate);
        const applicableDays = slot.applicableDays.map(day => String(day).trim().toUpperCase());
        if (!applicableDays.includes(shiftWorkingDay)) {
          throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.SLOT_NOT_APPLICABLE_TO_DAY);
        }
      }
      return {
        slotId: input.slotId,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };
    }

    if (requireTimes && (!input.startTime || !input.endTime)) {
      throw new BadRequestException(RESPONSE_MESSAGES.SHIFTS.TIME_REQUIRED_WITHOUT_SLOT);
    }

    return {
      slotId: null,
      startTime: input.startTime as string,
      endTime: input.endTime as string,
    };
  }

  /** Validate ca trực theo facility_operating_hours của đúng ngày trong tuần. */
  private async validateFacilityOperatingHours(
    facilityId: string,
    shiftDate: string,
    startTime: string,
    endTime: string,
    status: DoctorShiftStatus,
    cache?: BulkValidationCache,
  ): Promise<void> {
    if (status === DoctorShiftStatus.OFF || status === DoctorShiftStatus.CANCELLED) return;

    const schedule = await this.resolveCached(
      cache?.operatingHours,
      facilityId,
      () => this.facilitiesService.getOperatingHours(facilityId),
    );
    const dayOfWeek = workingDayOf(shiftDate);
    const nextDayOfWeek = workingDayOf(addDays(shiftDate, 1));
    const operatingHour = schedule.operatingHours.find(item => item.dayOfWeek === dayOfWeek);
    const nextOperatingHour = schedule.operatingHours.find(item => item.dayOfWeek === nextDayOfWeek);
    validateFacilityHours(operatingHour, startTime, endTime, status, nextOperatingHour);
  }

  /** Chỉ cho xếp lịch ở facility đang hoạt động. */
  private async ensureActiveFacility(facilityId: string): Promise<Facility> {
    const facility = await this.facilitiesService.findById(facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new ConflictException(RESPONSE_MESSAGES.SHIFTS.FACILITY_INACTIVE);
    }
    return facility;
  }

  private resolveCached<T>(
    cache: Map<string, Promise<T>> | undefined,
    key: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!cache) return loader();
    const existing = cache.get(key);
    if (existing) return existing;
    const pending = loader().catch(error => {
      // Khong giu mot Promise bi reject trong cache; candidate sau co the thu lai loi ket noi tam thoi.
      cache.delete(key);
      throw error;
    });
    cache.set(key, pending);
    return pending;
  }

}
