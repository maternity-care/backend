import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ActiveStatus, DoctorShiftStatus, FacilityStatus } from '../../../common/constants/status.enum';
import { DOCTOR_SHIFT_CONSTANT } from '../../../common/constants/doctor-shift.constant';
import { Facility } from '../../facilities/entities/facilities.entity';
import { FacilitiesService } from '../../facilities/facilities.service';
import { RoomsService } from '../../rooms/rooms.service';
import { DoctorShift } from '../entities/doctor-shifts.entity';
import { CheckShiftConflictDto } from '../dto/requests/check-shift-conflict.dto';
import { CreateDoctorShiftDto } from '../dto/requests/create-doctor-shift.dto';
import { DoctorAvailabilityQueryDto } from '../dto/requests/doctor-availability.dto';
import {
  addDays,
  currentWeekStart,
  throwIfConflicted,
  validateFacilityHours,
  validateSchedule,
  validateStatusDetails,
} from '../helpers/doctor-shifts.helper';
import {
  DOCTOR_SHIFTS_REPOSITORY,
  IDoctorShiftsRepository,
} from '../interfaces/doctor-shifts-repository.interface';

/** Gom toàn bộ validation cần service/repository khác ra khỏi service chính. */
@Injectable()
export class DoctorShiftsValidator {
  constructor(
    @Inject(DOCTOR_SHIFTS_REPOSITORY)
    private readonly repository: IDoctorShiftsRepository,
    private readonly facilitiesService: FacilitiesService,
    private readonly roomsService: RoomsService,
  ) {}

  async validateForCreate(dto: CreateDoctorShiftDto): Promise<void> {
    
    const facility = await this.validateReferences(dto.doctorId, dto.facilityId, dto.roomId);

    validateSchedule(dto.shiftDate, dto.startTime, dto.endTime, true);
    validateStatusDetails(dto.status, dto.roomId);
    validateFacilityHours(facility, dto.startTime, dto.endTime, dto.status);
    
    throwIfConflicted(await this.repository.findConflicts(dto));
  }

  async validateForUpdate(shift: DoctorShift): Promise<void> {
    const facility = await this.validateReferences(shift.doctorId, shift.facilityId, shift.roomId);
    validateSchedule(shift.shiftDate, shift.startTime, shift.endTime, false);
    validateStatusDetails(shift.status, shift.roomId);
    validateFacilityHours(facility, shift.startTime, shift.endTime, shift.status);
    if (shift.status !== DoctorShiftStatus.CANCELLED) {
      throwIfConflicted(await this.repository.findConflicts({
        doctorId: shift.doctorId,
        roomId: shift.roomId,
        shiftDate: shift.shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        excludeShiftId: shift.id,
      }));
    }
  }

  async validateForConflictCheck(dto: CheckShiftConflictDto): Promise<void> {
    // kiểm tra xem bác sĩ, cơ sở y tế và phòng có hợp lệ không, nếu không hợp lệ thì ném ra lỗi xung đột.
    const facility = await this.validateReferences(dto.doctorId, dto.facilityId, dto.roomId);
    //kiểm tra xem ca trực có hợp lệ không, nếu không hợp lệ thì ném ra lỗi xung đột.
    validateSchedule(dto.shiftDate, dto.startTime, dto.endTime, true);
    // kiểm tra xem ca trực có hợp lệ không, nếu không hợp lệ thì ném ra lỗi xung đột.
    validateFacilityHours(facility, dto.startTime, dto.endTime, DoctorShiftStatus.AVAILABLE);
  }

  async validateDoctorAvailabilityInput(
    doctorId: string,
    query: DoctorAvailabilityQueryDto,
  ): Promise<void> {
    await this.ensureActiveFacility(query.facilityId);
    if (!await this.repository.isDoctorAssignedToFacility(doctorId, query.facilityId)) {
      throw new ConflictException(DOCTOR_SHIFT_CONSTANT.DOCTOR_NOT_ASSIGNED);
    }
  }

  // trả về start, end của tuần, 
  // đồng thời kiểm tra xem cơ sở y tế có hợp lệ không, 
  // nếu không hợp lệ thì ném ra lỗi xung đột.
  async prepareWeeklyRange(
    facilityId: string,
    weekStart?: string,
    doctorId?: string,
  ): Promise<{ start: string; end: string }> {
    await this.ensureActiveFacility(facilityId);
    // nếu có doctorId nhưng bác sĩ không được chỉ định cho cơ sở y tế, ném ra lỗi xung đột.
    if (doctorId && !await this.repository.isDoctorAssignedToFacility(doctorId, facilityId)) {
      throw new ConflictException(DOCTOR_SHIFT_CONSTANT.DOCTOR_NOT_ASSIGNED);
    }
    const start = weekStart ?? currentWeekStart();
    return { start, end: addDays(start, 6) };
  }

  //kiem tra bac si co hop le khong, co hop le thi tra ve facility
  //dong thoi kiem tra room co hop le khong
  private async validateReferences(
    doctorId: string,
    facilityId: string,
    roomId?: string | null,
  ): Promise<Facility> {
    const facility = await this.ensureActiveFacility(facilityId);
    if (!await this.repository.isDoctorAssignedToFacility(doctorId, facilityId)) {
      throw new ConflictException(DOCTOR_SHIFT_CONSTANT.DOCTOR_NOT_ASSIGNED);
    }
    if (roomId) {
      const room = await this.roomsService.findById(roomId);
      if (room.facilityId !== facilityId || room.status !== ActiveStatus.ACTIVE) {
        throw new ConflictException(DOCTOR_SHIFT_CONSTANT.ROOM_INVALID);
      }
    }
    return facility;
  }


  //kiem tra status facility
  private async ensureActiveFacility(facilityId: string): Promise<Facility> {
    const facility = await this.facilitiesService.findById(facilityId);
    if (facility.status !== FacilityStatus.ACTIVE) {
      throw new ConflictException(DOCTOR_SHIFT_CONSTANT.FACILITY_INACTIVE);
    }
    return facility;
  }
}
