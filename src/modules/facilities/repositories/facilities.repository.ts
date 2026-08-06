import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Facility } from '../entities/facility.entity';
import { FacilityClosureDay } from '../entities/facility-closure-day.entity';
import { FacilityDayOfWeek, FacilityOperatingHour } from '../entities/facility-operating-hour.entity';
import {
  AccountStatus,
  ActiveStatus,
  AppointmentDisruptionResolutionStatus,
  AppointmentStatus,
  DoctorShiftStatus,
  FacilityStatus,
  InactiveSource,
  ShiftDisruptionStatus,
} from '../../../common/constants/status.enum';
import { RoleEnum } from '../../../common/constants/role.enum';
import { Room } from '../../rooms/entities/room.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { AppointmentDisruptionItem } from '../../shifts/entities/appointment-disruption-item.entity';
import { DoctorShiftChangeLog } from '../../shifts/entities/doctor-shift-change-log.entity';
import { ShiftDisruption } from '../../shifts/entities/shift-disruption.entity';
import {
  FacilityAdminOption,
  FacilityShiftScheduleViolation,
  FacilityShiftSlotScheduleViolation,
  FacilityLookup,
  FacilityWithDetails,
  IFacilitiesRepository,
} from '../interfaces/facility-repository.interface';
import { SearchFacilityClosureDayDto } from '../dto/requests/facility-closure-day.dto';
import { SearchFacilityAdminOptionsDto } from '../dto/requests/search-facility-admin-options.dto';
import { LookupFacilityDto, SearchFacilityDto } from '../dto/requests/search-facility.dto';
import { PaginationResult } from '../../../common/helpers/pagination';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';
import { addDays, dateTimeToTime, shiftIntervalsOverlap } from '../../shifts/helpers/shifts.helper';

interface AffectedAppointmentBlock {
  id: string;
  doctorId: string;
  roomId: string | null;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  status: string;
}

@Injectable()
export class FacilitiesRepository implements IFacilitiesRepository {
  constructor(
    @InjectRepository(Facility)
    private readonly repository: Repository<Facility>,
    @InjectRepository(FacilityOperatingHour)
    private readonly operatingHourRepository: Repository<FacilityOperatingHour>,
    @InjectRepository(FacilityClosureDay)
    private readonly closureDayRepository: Repository<FacilityClosureDay>,
  ) {}

  create(data: DeepPartial<Facility>): Facility {
    return this.repository.create(data);
  }

  save(facility: Facility): Promise<Facility> {
    return this.repository.save(facility);
  }

  async syncOperatingHours(
    facilityId: string,
    operatingHours: Array<{ dayOfWeek: FacilityDayOfWeek; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ): Promise<void> {
    await this.repository.manager.transaction(async manager => {
      await manager.delete(FacilityOperatingHour, { facilityId });
      await manager.save(
        FacilityOperatingHour,
        operatingHours.map(item => manager.create(FacilityOperatingHour, { ...item, facilityId })),
      );
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
    return this.repository.manager
      .createQueryBuilder()
      .select('shift.id', 'id')
      // DATE column khi đi qua MySQL driver đôi lúc bị ép thành Date object rồi lệch ngày khi toISOString().
      // Format thẳng ở DB để validate operating-hours luôn dùng đúng ngày YYYY-MM-DD như dữ liệu trong MySQL.
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
    return this.repository.manager
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

  createClosureDay(data: DeepPartial<FacilityClosureDay>): FacilityClosureDay {
    return this.closureDayRepository.create(data);
  }

  saveClosureDay(closureDay: FacilityClosureDay): Promise<FacilityClosureDay> {
    return this.closureDayRepository.save(closureDay);
  }

  async removeClosureDay(closureDay: FacilityClosureDay): Promise<void> {
    await this.closureDayRepository.remove(closureDay);
  }

  async findClosureDaysByFacilityId(
    facilityId: string,
    filters?: SearchFacilityClosureDayDto,
  ): Promise<Array<{ id: string; facilityId: string; closureDate: string; reason: string | null; status: string }>> {
    const query = this.closureDayRepository
      .createQueryBuilder('closureDay')
      .select('closureDay.id', 'id')
      .addSelect('closureDay.facilityId', 'facilityId')
      .addSelect('closureDay.closureDate', 'closureDate')
      .addSelect('closureDay.reason', 'reason')
      .addSelect('closureDay.status', 'status')
      .where('closureDay.facilityId = :facilityId', { facilityId });

    if (filters?.fromDate) {
      query.andWhere('closureDay.closureDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('closureDay.closureDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.status) {
      query.andWhere('closureDay.status = :status', { status: filters.status });
    }

    return query.orderBy('closureDay.closureDate', 'ASC').getRawMany();
  }

  findClosureDayById(facilityId: string, closureDayId: string): Promise<FacilityClosureDay | null> {
    return this.closureDayRepository.findOne({
      where: {
        id: closureDayId,
        facilityId,
      },
    });
  }

  findClosureDayByDate(facilityId: string, closureDate: string): Promise<FacilityClosureDay | null> {
    return this.closureDayRepository.findOne({
      where: {
        facilityId,
        closureDate,
      },
    });
  }

  findAll(filters?: SearchFacilityDto): Promise<FacilityWithDetails[]> {
    return this.buildDetailsQuery(filters)
      .orderBy('facility.createdAt', 'DESC')
      .getRawMany<FacilityWithDetails>();
  }

  async findAllPaginated(filters?: SearchFacilityDto): Promise<PaginationResult<FacilityWithDetails>> {
    const query = this.buildDetailsQuery(filters)
      .orderBy('facility.createdAt', 'DESC');

    return this.paginateRaw<FacilityWithDetails>(query, {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  findById(id: string): Promise<Facility | null> {
    return this.repository
      .createQueryBuilder('facility')
      .where('facility.id = :id', { id })
      .andWhere('facility.deletedAt IS NULL')
      .getOne();
  }

  async findDetailsById(id: string): Promise<FacilityWithDetails | null> {
    return (await this.buildDetailsQuery()
      .andWhere('facility.id = :id', { id })
      .getRawOne<FacilityWithDetails>()) ?? null;
  }

  findByCode(code: string): Promise<Facility | null> {
    return this.repository.findOne({ where: { code } });
  }

  async findCodesByPrefix(prefix: string): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('facility')
      .withDeleted()
      .select('facility.code', 'code')
      .where('facility.code LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawMany<{ code: string }>();

    return rows.map(row => row.code);
  }

  findByName(name: string): Promise<Facility | null> {
    return this.repository
      .createQueryBuilder('facility')
      .where('LOWER(facility.name) = LOWER(:name)', { name })
      .andWhere('facility.deletedAt IS NULL')
      .getOne();
  }

  findByEmail(email: string): Promise<Facility | null> {
    return this.repository
      .createQueryBuilder('facility')
      .where('LOWER(facility.email) = LOWER(:email)', { email })
      .andWhere('facility.deletedAt IS NULL')
      .getOne();
  }

  findByPhone(phone: string): Promise<Facility | null> {
    return this.repository
      .createQueryBuilder('facility')
      .where('facility.phone = :phone', { phone })
      .andWhere('facility.deletedAt IS NULL')
      .getOne();
  }

  async existsActiveOwner(ownerId: string): Promise<boolean> {
    const count = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('staffs', 'staff')
      .innerJoin('staff_roles', 'staffRole', 'staffRole.staff_id = staff.id')
      .innerJoin('roles', 'role', 'role.id = staffRole.role_id')
      .where('staff.id = :ownerId', { ownerId })
      .andWhere('staff.status = :status', { status: AccountStatus.ACTIVE })
      .andWhere('role.name = :roleName', { roleName: RoleEnum.ADMIN })
      .getRawOne<{ count: string }>();

    return Number(count?.count ?? 0) > 0;
  }

  async findAdminOptions(filters?: SearchFacilityAdminOptionsDto): Promise<PaginationResult<FacilityAdminOption>> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Number(filters?.limit) || 20);
    const status = filters?.status ?? AccountStatus.ACTIVE;

    const query = this.repository.manager
      .createQueryBuilder()
      .from('staffs', 'staff')
      .innerJoin('staff_roles', 'staffRole', 'staffRole.staff_id = staff.id')
      .innerJoin('roles', 'role', 'role.id = staffRole.role_id')
      .leftJoin('facilities', 'homeFacility', 'homeFacility.id = staff.facility_id AND homeFacility.deleted_at IS NULL')
      .where('role.name = :roleName', { roleName: RoleEnum.ADMIN })
      .andWhere('staff.status = :status', { status })
      .select('staff.id', 'id')
      .addSelect('staff.name', 'name')
      .addSelect('staff.email', 'email')
      .addSelect('staff.personal_email', 'personalEmail')
      .addSelect('staff.phone', 'phone')
      .addSelect('staff.employee_code', 'employeeCode')
      .addSelect('staff.status', 'status')
      .addSelect('staff.facility_id', 'homeFacilityId')
      .addSelect('homeFacility.name', 'homeFacilityName')
      .addSelect('homeFacility.code', 'homeFacilityCode')
      .addSelect('role.id', 'roleId')
      .addSelect('role.name', 'roleName')
      .addSelect((subQuery) => (
        subQuery
          .select('COUNT(1)')
          .from('facilities', 'ownedFacility')
          .where('ownedFacility.owner_id = staff.id')
          .andWhere('ownedFacility.deleted_at IS NULL')
      ), 'ownedFacilityCount');

    if (filters?.search) {
      query.andWhere(
        [
          'LOWER(staff.name) LIKE LOWER(:search)',
          'LOWER(staff.email) LIKE LOWER(:search)',
          'LOWER(staff.personal_email) LIKE LOWER(:search)',
          'LOWER(staff.phone) LIKE LOWER(:search)',
          'LOWER(staff.employee_code) LIKE LOWER(:search)',
        ].join(' OR '),
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.availableOnly === 'true') {
      query.andWhere(`
        NOT EXISTS (
          SELECT 1
          FROM facilities ownedFacility
          WHERE ownedFacility.owner_id = staff.id
            AND ownedFacility.deleted_at IS NULL
        )
      `);
    }

    const totalRow = await query.clone()
      .select('COUNT(DISTINCT staff.id)', 'count')
      .getRawOne<{ count: string }>();
    const items = await query
      .orderBy('staff.name', 'ASC')
      .addOrderBy('staff.employee_code', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<FacilityAdminOption & { ownedFacilityCount: string }>();

    return {
      items: items.map(item => ({
        ...item,
        ownedFacilityCount: Number(item.ownedFacilityCount ?? 0),
      })),
      total: Number(totalRow?.count ?? 0),
      page,
      limit,
      totalPages: Math.ceil(Number(totalRow?.count ?? 0) / limit),
    };
  }

  lookup(filters?: LookupFacilityDto): Promise<FacilityLookup[]> {
    const query = this.buildDetailsQuery({
      search: filters?.search,
      status: filters?.status,
    })
      .select('facility.id', 'id')
      .addSelect('facility.name', 'name')
      .addSelect('facility.code', 'code')
      .addSelect('facility.address', 'address')
      .addSelect('facility.province', 'province')
      .addSelect('facility.ward', 'ward')
      .addSelect('facility.status', 'status')
      .addSelect('owner.name', 'ownerName')
      .orderBy('facility.name', 'ASC')
      .limit(Math.max(1, Number(filters?.limit) || 20));

    return query.getRawMany<FacilityLookup>();
  }

  async remove(facility: Facility): Promise<void> {
    await this.repository.manager.transaction(async manager => {
      await manager.delete(FacilityOperatingHour, { facilityId: facility.id });
      await manager.delete(FacilityClosureDay, { facilityId: facility.id });
      await manager.remove(Facility, facility);
    });
  }

  async countDependencies(facilityId: string): Promise<number> {
    const tables = [
      { table: 'rooms', column: 'facility_id' },
      { table: 'shifts', column: 'facility_id' },
      { table: 'appointments', column: 'facility_id' },
      { table: 'staffs', column: 'facility_id' },
      { table: 'package_service_facilities', column: 'facility_id' },
      { table: 'facility_services', column: 'facility_id' },
    ];

    const rows = await Promise.all(tables.map(item =>
      this.countRowsIfTableExists(item.table, item.column, facilityId),
    ));

    return rows.reduce((total, count) => total + count, 0);
  }

  async softDelete(facility: Facility, reason?: string, deletedBy?: string | null): Promise<Facility> {
    facility.status = FacilityStatus.DELETED;
    facility.deletedAt = new Date();
    facility.deletedBy = deletedBy ?? null;
    facility.deleteReason = reason ?? null;
    return this.repository.save(facility);
  }

  async updateStatus(id: string, status: FacilityStatus): Promise<Facility> {
    const facility = await this.findById(id);
    if (!facility) {
      throw new Error(RESPONSE_MESSAGES.FACILITIES.NOT_FOUND);
    }
    facility.status = status;
    return this.repository.save(facility);
  }

  async countSuspendImpact(facilityId: string, from: Date, until?: Date | null) {
    const fromDate = from.toISOString().slice(0, 10);
    const untilDate = until ? until.toISOString().slice(0, 10) : null;
    const activeAppointmentStatuses = [
      'pending_payment',
      'booked',
      'confirmed',
      'checked_in',
      'in_progress',
    ];

    const roomCount = await this.countRowsIfTableExists('rooms', 'facility_id', facilityId);

    const shiftQuery = this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('shifts', 'shift')
      .where('shift.facility_id = :facilityId', { facilityId })
      .andWhere('shift.deleted_at IS NULL')
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL, DoctorShiftStatus.OFF],
      })
      .andWhere('shift.shift_date >= :fromDate', { fromDate });

    if (untilDate) {
      shiftQuery.andWhere('shift.shift_date <= :untilDate', { untilDate });
    }

    const appointmentQuery = this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('appointments', 'appointment')
      .where('appointment.facility_id = :facilityId', { facilityId })
      .andWhere('appointment.status IN (:...statuses)', { statuses: activeAppointmentStatuses })
      .andWhere('appointment.scheduled_start >= :from', { from });

    if (until) {
      appointmentQuery.andWhere('appointment.scheduled_start <= :until', { until });
    }

    const [shiftRow, appointmentRow] = await Promise.all([
      shiftQuery.getRawOne<{ count: string }>(),
      appointmentQuery.getRawOne<{ count: string }>(),
    ]);

    return {
      affectedRooms: roomCount,
      affectedShifts: Number(shiftRow?.count ?? 0),
      affectedAppointments: Number(appointmentRow?.count ?? 0),
    };
  }

  async suspendActiveRoomsForFacility(
    facilityId: string,
    from: Date,
    until: Date | null,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<number> {
    const result = await this.repository.manager
      .createQueryBuilder()
      .update(Room)
      .set({
        status: ActiveStatus.INACTIVE,
        inactiveFrom: from,
        inactiveUntil: until,
        inactiveReason: reason ?? null,
        inactiveSource: InactiveSource.FACILITY_SUSPEND,
        inactiveBy: actorId ?? null,
        reactivatedAt: null,
        reactivatedBy: null,
      })
      .where('facility_id = :facilityId', { facilityId })
      .andWhere('deleted_at IS NULL')
      .andWhere('status = :status', { status: ActiveStatus.ACTIVE })
      .execute();

    return result.affected ?? 0;
  }

  async reactivateRoomsSuspendedByFacility(facilityId: string, actorId?: string | null): Promise<number> {
    const result = await this.repository.manager
      .createQueryBuilder()
      .update(Room)
      .set({
        status: ActiveStatus.ACTIVE,
        inactiveSource: null,
        reactivatedAt: new Date(),
        reactivatedBy: actorId ?? null,
      })
      .where('facility_id = :facilityId', { facilityId })
      .andWhere('deleted_at IS NULL')
      .andWhere('status = :status', { status: ActiveStatus.INACTIVE })
      .andWhere('inactive_source = :source', { source: InactiveSource.FACILITY_SUSPEND })
      .execute();

    return result.affected ?? 0;
  }

  async cancelFutureShiftsForFacility(
    facilityId: string,
    from: Date,
    until?: Date | null,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<number> {
    return this.repository.manager.transaction(async manager => {
      const shifts = await this.findSuspendAffectedShifts(
        manager,
        { facilityId },
        from,
        until,
      );

      for (const shift of shifts) {
        const affectedAppointments = await this.findActiveAppointmentsForShift(manager, shift);

        await manager.update(Shift, shift.id, {
          status: DoctorShiftStatus.CANCELLED,
        });

        await this.insertShiftChangeLog(
          manager,
          shift,
          'facility_suspended',
          reason,
          actorId,
        );

        if (affectedAppointments.length > 0) {
          await this.insertShiftDisruption(
            manager,
            shift,
            affectedAppointments,
            {
              type: 'facility_suspended',
              sourceType: 'facility',
              sourceId: facilityId,
              reason,
              actorId,
            },
          );
        }
      }

      return shifts.length;
    });
  }

  private findSuspendAffectedShifts(
    manager: EntityManager,
    scope: { facilityId: string; roomId?: string },
    from: Date,
    until?: Date | null,
  ): Promise<Shift[]> {
    const query = manager
      .getRepository(Shift)
      .createQueryBuilder('shift')
      .setLock('pessimistic_write')
      .where('shift.facilityId = :facilityId', { facilityId: scope.facilityId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL, DoctorShiftStatus.OFF],
      })
      .andWhere('shift.shiftDate >= :fromDate', { fromDate: from.toISOString().slice(0, 10) })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC');

    if (scope.roomId) {
      query.andWhere('shift.roomId = :roomId', { roomId: scope.roomId });
    }

    if (until) {
      query.andWhere('shift.shiftDate <= :untilDate', { untilDate: until.toISOString().slice(0, 10) });
    }

    return query.getMany();
  }

  private async findActiveAppointmentsForShift(
    manager: EntityManager,
    shift: Shift,
  ): Promise<AffectedAppointmentBlock[]> {
    const shiftDate = this.formatDateOnly(shift.shiftDate);
    const nextDate = addDays(shiftDate, 1);
    const appointments = await manager
      .createQueryBuilder()
      .select('appointment.id', 'id')
      .addSelect('appointment.doctor_id', 'doctorId')
      .addSelect('appointment.room_id', 'roomId')
      .addSelect('appointment.scheduled_start', 'scheduledStart')
      .addSelect('appointment.scheduled_end', 'scheduledEnd')
      .addSelect('appointment.status', 'status')
      .from('appointments', 'appointment')
      .where('appointment.facility_id = :facilityId', { facilityId: shift.facilityId })
      .andWhere('appointment.doctor_id = :staffId', { staffId: shift.staffId })
      .andWhere('DATE(appointment.scheduled_start) BETWEEN :shiftDate AND :nextDate', { shiftDate, nextDate })
      .andWhere('appointment.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.PENDING_PAYMENT,
          AppointmentStatus.BOOKED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_PROGRESS,
        ],
      })
      .orderBy('appointment.scheduled_start', 'ASC')
      .getRawMany<AffectedAppointmentBlock>();

    return appointments.filter(appointment =>
      shiftIntervalsOverlap(
        shiftDate,
        shift.startTime,
        shift.endTime,
        this.formatDateOnly(appointment.scheduledStart),
        dateTimeToTime(appointment.scheduledStart),
        dateTimeToTime(appointment.scheduledEnd),
      ),
    );
  }

  private async insertShiftChangeLog(
    manager: EntityManager,
    shift: Shift,
    action: string,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<void> {
    await manager.createQueryBuilder().insert().into(DoctorShiftChangeLog).values({
      shiftId: shift.id,
      action,
      oldStatus: shift.status,
      newStatus: DoctorShiftStatus.CANCELLED,
      oldStaffId: shift.staffId,
      newStaffId: shift.staffId,
      oldRoomId: shift.roomId,
      newRoomId: shift.roomId,
      oldStartTime: shift.startTime,
      newStartTime: shift.startTime,
      oldEndTime: shift.endTime,
      newEndTime: shift.endTime,
      reason: reason ?? null,
      changedBy: actorId ?? null,
    }).execute();
  }

  private async insertShiftDisruption(
    manager: EntityManager,
    shift: Shift,
    affectedAppointments: AffectedAppointmentBlock[],
    options: {
      type: string;
      sourceType: string;
      sourceId: string;
      reason?: string | null;
      actorId?: string | null;
    },
  ): Promise<void> {
    const result = await manager.createQueryBuilder().insert().into(ShiftDisruption).values({
      type: options.type,
      sourceType: options.sourceType,
      sourceId: options.sourceId,
      facilityId: shift.facilityId,
      shiftId: shift.id,
      staffId: shift.staffId,
      doctorShiftId: shift.id,
      roomId: shift.roomId ?? null,
      reason: options.reason ?? null,
      status: ShiftDisruptionStatus.OPEN,
      createdBy: options.actorId ?? null,
    }).execute();
    const disruptionId = String(result.identifiers[0]?.id);

    await manager.createQueryBuilder().insert().into(AppointmentDisruptionItem).values(
      affectedAppointments.map(appointment => ({
        disruptionId,
        appointmentId: appointment.id,
        oldStaffId: shift.staffId,
        oldDoctorId: shift.staffId,
        oldRoomId: shift.roomId ?? null,
        oldScheduledStart: appointment.scheduledStart as Date,
        oldScheduledEnd: appointment.scheduledEnd as Date,
        resolutionStatus: AppointmentDisruptionResolutionStatus.PENDING,
      })),
    ).execute();
  }

  private formatDateOnly(value: string | Date): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private buildDetailsQuery(filters?: Pick<SearchFacilityDto, 'search' | 'city' | 'ownerId' | 'status'>): SelectQueryBuilder<Facility> {
    const query = this.repository
      .createQueryBuilder('facility')
      .leftJoin('staffs', 'owner', 'owner.id = facility.ownerId')
      .where('facility.deletedAt IS NULL')
      .select('facility.id', 'id')
      .addSelect('facility.name', 'name')
      .addSelect('facility.code', 'code')
      .addSelect('facility.ownerId', 'ownerId')
      .addSelect('owner.name', 'ownerName')
      .addSelect('owner.email', 'ownerEmail')
      .addSelect('owner.phone', 'ownerPhone')
      .addSelect('facility.phone', 'phone')
      .addSelect('facility.email', 'email')
      .addSelect('facility.address', 'address')
      .addSelect('facility.province', 'province')
      .addSelect('facility.ward', 'ward')
      .addSelect('facility.latitude', 'latitude')
      .addSelect('facility.longitude', 'longitude')
      .addSelect('facility.status', 'status')
      .addSelect('facility.inactiveFrom', 'inactiveFrom')
      .addSelect('facility.inactiveUntil', 'inactiveUntil')
      .addSelect('facility.inactiveReason', 'inactiveReason')
      .addSelect('facility.inactiveSource', 'inactiveSource')
      .addSelect('facility.inactiveBy', 'inactiveBy')
      .addSelect('facility.reactivatedAt', 'reactivatedAt')
      .addSelect('facility.reactivatedBy', 'reactivatedBy')
      .addSelect('facility.createdAt', 'createdAt')
      .addSelect('facility.updatedAt', 'updatedAt');

    if (filters?.search) {
      query.andWhere(
        [
          'LOWER(facility.name) LIKE LOWER(:search)',
          'LOWER(facility.code) LIKE LOWER(:search)',
          'LOWER(facility.phone) LIKE LOWER(:search)',
          'LOWER(facility.email) LIKE LOWER(:search)',
          'LOWER(facility.address) LIKE LOWER(:search)',
          'LOWER(facility.province) LIKE LOWER(:search)',
          'LOWER(facility.ward) LIKE LOWER(:search)',
          'LOWER(owner.name) LIKE LOWER(:search)',
        ].join(' OR '),
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.city) {
      query.andWhere(
        '(LOWER(facility.province) LIKE LOWER(:city) OR LOWER(facility.ward) LIKE LOWER(:city))',
        { city: `%${filters.city}%` },
      );
    }

    if (filters?.ownerId) {
      query.andWhere('facility.ownerId = :ownerId', { ownerId: filters.ownerId });
    }

    if (filters?.status) {
      query.andWhere('facility.status = :status', { status: filters.status });
    }

    return query;
  }

  private async paginateRaw<T>(
    query: SelectQueryBuilder<Facility>,
    options?: { page?: number; limit?: number },
  ): Promise<PaginationResult<T>> {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const total = await query.clone().getCount();
    const items = await query.offset((page - 1) * limit).limit(limit).getRawMany<T>();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async countRowsIfTableExists(table: string, column: string, facilityId: string): Promise<number> {
    try {
      const row = await this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from(table, table)
        .where(`${table}.${column} = :facilityId`, { facilityId })
        .getRawOne<{ count: string }>();

      return Number(row?.count ?? 0);
    } catch (error) {
      const driverError = error as { code?: string; errno?: number };
      if (driverError.code === 'ER_NO_SUCH_TABLE' || driverError.errno === 1146) {
        return 0;
      }
      throw error;
    }
  }
}
