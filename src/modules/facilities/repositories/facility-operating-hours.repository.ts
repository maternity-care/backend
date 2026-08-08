import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FacilityOperatingHour, FacilityDayOfWeek } from '../entities/facility-operating-hour.entity';
import { ShiftSlot } from '../../../database/entities/shift-slot.entity';
import { ActiveStatus, DoctorShiftStatus } from '../../../common/constants/status.enum';
import { IFacilityOperatingHoursRepository } from '../interfaces/facility-operating-hours-repository.interface';
import { FacilityShiftScheduleViolation, FacilityShiftSlotScheduleViolation } from '../interfaces/facility-repository.interface';

@Injectable()
export class FacilityOperatingHoursRepository implements IFacilityOperatingHoursRepository {
  constructor(
    @InjectRepository(FacilityOperatingHour)
    private readonly operatingHourRepository: Repository<FacilityOperatingHour>,
  ) {}

  async syncOperatingHours(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: FacilityDayOfWeek; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ): Promise<void> {
    await this.operatingHourRepository.manager.transaction(async manager => {
      await manager.delete(FacilityOperatingHour, { facilityId });
      await manager.save(
        FacilityOperatingHour,
        operatingHours.map(item => manager.create(FacilityOperatingHour, { ...item, facilityId })),
      );
    });
  }

  async applyOperatingHours(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: FacilityDayOfWeek; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
    deactivateShiftSlotIds: string[],
  ): Promise<number> {
    return this.operatingHourRepository.manager.transaction(async manager => {
      let deactivatedShiftSlotCount = 0;

      if (deactivateShiftSlotIds.length > 0) {
        const result = await manager
          .createQueryBuilder()
          .update(ShiftSlot)
          .set({ status: ActiveStatus.INACTIVE })
          .where('facility_id = :facilityId', { facilityId })
          .andWhere('id IN (:...slotIds)', { slotIds: deactivateShiftSlotIds })
          .andWhere('deleted_at IS NULL')
          .andWhere('status = :status', { status: ActiveStatus.ACTIVE })
          .execute();
        deactivatedShiftSlotCount = result.affected ?? 0;
      }

      await manager.delete(FacilityOperatingHour, { facilityId });
      await manager.save(
        FacilityOperatingHour,
        operatingHours.map(item => manager.create(FacilityOperatingHour, { ...item, facilityId })),
      );

      return deactivatedShiftSlotCount;
    });
  }

  async findOperatingHoursByFacilityId(facilityId: string): Promise<Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean }>> {
    return this.operatingHourRepository
      .createQueryBuilder('operatingHour')
      .select('operatingHour.dayOfWeek', 'dayOfWeek')
      .addSelect('operatingHour.openTime', 'openTime')
      .addSelect('operatingHour.closeTime', 'closeTime')
      .addSelect('operatingHour.isClosed', 'isClosed')
      .where('operatingHour.facilityId = :facilityId', { facilityId })
      .orderBy(`FIELD(operatingHour.dayOfWeek, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')`)
      .getRawMany();
  }

  async findActiveShiftsForOperatingHourValidation(
    facilityId: string,
    fromDate: string,
  ): Promise<FacilityShiftScheduleViolation[]> {
    return this.operatingHourRepository.manager
      .createQueryBuilder()
      .select('shift.id', 'id')
      .addSelect("DATE_FORMAT(shift.shift_date, '%Y-%m-%d')", 'shiftDate')
      .addSelect('shift.start_time', 'startTime')
      .addSelect('shift.end_time', 'endTime')
      .addSelect('shift.status', 'status')
      .addSelect('staff.name', 'doctorName')
      .addSelect('room.name', 'roomName')
      .addSelect('slot.name', 'slotName')
      .from('shifts', 'shift')
      .leftJoin('staffs', 'staff', 'staff.id = shift.staff_id')
      .leftJoin('rooms', 'room', 'room.id = shift.room_id')
      .leftJoin('shift_slots', 'slot', 'slot.id = shift.slot_id')
      .where('shift.facility_id = :facilityId', { facilityId })
      .andWhere('shift.deleted_at IS NULL')
      .andWhere('shift.shift_date >= :fromDate', { fromDate })
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL],
      })
      .orderBy('shift.shift_date', 'ASC')
      .addOrderBy('shift.start_time', 'ASC')
      .getRawMany<FacilityShiftScheduleViolation>();
  }

  async findActiveShiftSlotsForOperatingHourValidation(
    facilityId: string,
  ): Promise<FacilityShiftSlotScheduleViolation[]> {
    return this.operatingHourRepository.manager
      .createQueryBuilder()
      .select('slot.id', 'id')
      .addSelect('slot.name', 'name')
      .addSelect('slot.code', 'code')
      .addSelect('slot.start_time', 'startTime')
      .addSelect('slot.end_time', 'endTime')
      .addSelect('slot.status', 'status')
      .from('shift_slots', 'slot')
      .where('slot.facility_id = :facilityId', { facilityId })
      .andWhere('slot.deleted_at IS NULL')
      .andWhere('slot.status = :status', { status: ActiveStatus.ACTIVE })
      .orderBy('slot.start_time', 'ASC')
      .addOrderBy('slot.end_time', 'ASC')
      .getRawMany<FacilityShiftSlotScheduleViolation>();
  }
}
