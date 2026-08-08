import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Room } from '../entities/room.entity';
import {
  FacilityRoomType,
  IRoomsRepository,
  RoomLookup,
  RoomTypeDetails,
  RoomTypeLookup,
  RoomWithDetails,
} from '../interfaces/rooms-repository.interface';
import {
  LookupRoomsDto,
  LookupRoomTypesDto,
  SearchRoomsDto,
  SearchRoomTypesDto,
} from '../dto/requests/search-rooms.dto';
import { SearchRooms2Dto } from '../dto/requests/search-room-2';
import {
  ActiveStatus,
  AppointmentDisruptionResolutionStatus,
  AppointmentStatus,
  DoctorShiftStatus,
  ShiftDisruptionStatus,
} from '../../../common/constants/status.enum';
import { PaginationResult } from '../../../common/helpers/pagination';
import { RoomType } from '../../../database/entities/room-type.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { AppointmentDisruptionItem } from '../../shifts/entities/appointment-disruption-item.entity';
import { DoctorShiftChangeLog } from '../../shifts/entities/doctor-shift-change-log.entity';
import { ShiftDisruption } from '../../shifts/entities/shift-disruption.entity';
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
export class RoomsRepository implements IRoomsRepository {
  constructor(
    @InjectRepository(Room)
    private readonly repository: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  create(data: DeepPartial<Room>): Room {
    return this.repository.create(data);
  }

  save(room: Room): Promise<Room> {
    return this.repository.save(room);
  }

  saveMany(rooms: Room[]): Promise<Room[]> {
    return this.repository.manager.transaction((manager) => manager.save(Room, rooms));
  }

  async findCodesByFacilityAndPrefix(facilityId: string, prefix: string): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('room')
      .withDeleted()
      .select('room.code', 'code')
      .where('room.facilityId = :facilityId', { facilityId })
      .andWhere('room.code LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawMany<{ code: string }>();

    return rows.map((row) => row.code);
  }

  findAll(filters?: SearchRoomsDto): Promise<RoomWithDetails[]> {
    return this.buildDetailsQuery(filters)
      .orderBy('room.createdAt', 'DESC')
      .getRawMany<RoomWithDetails>();
  }

  async findAllPaginated(filters?: SearchRoomsDto): Promise<PaginationResult<RoomWithDetails>> {
    const query = this.buildDetailsQuery(filters).orderBy('room.createdAt', 'DESC');

    return this.paginateRaw<RoomWithDetails>(query, { page: filters?.page, limit: filters?.limit });
  }

  findById(id: string): Promise<Room | null> {
    return this.repository
      .createQueryBuilder('room')
      .where('room.id = :id', { id })
      .andWhere('room.deletedAt IS NULL')
      .getOne();
  }

  async findDetailsById(id: string): Promise<RoomWithDetails | null> {
    return (
      (await this.buildDetailsQuery()
        .andWhere('room.id = :id', { id })
        .getRawOne<RoomWithDetails>()) ?? null
    );
  }

  findByName(name: string): Promise<Room | null> {
    return this.repository
      .createQueryBuilder('room')
      .where('LOWER(room.name) = LOWER(:name)', { name })
      .andWhere('room.deletedAt IS NULL')
      .getOne();
  }

  findByFacilityAndName(
    facilityId: string,
    name: string,
    excludeId?: string,
  ): Promise<Room | null> {
    const query = this.repository
      .createQueryBuilder('room')
      .where('room.facilityId = :facilityId', { facilityId })
      .andWhere('LOWER(room.name) = LOWER(:name)', { name })
      .andWhere('room.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('room.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }

  createRoomType(data: DeepPartial<RoomType>): RoomType {
    return this.roomTypeRepository.create(data);
  }

  saveRoomType(roomType: RoomType): Promise<RoomType> {
    return this.roomTypeRepository.save(roomType);
  }

  findAllRoomTypes(filters?: SearchRoomTypesDto): Promise<RoomTypeDetails[]> {
    return this.buildRoomTypeQuery(filters)
      .orderBy('roomType.createdAt', 'DESC')
      .getRawMany<RoomTypeDetails>();
  }

  async findAllRoomTypesPaginated(
    filters?: SearchRoomTypesDto,
  ): Promise<PaginationResult<RoomTypeDetails>> {
    const query = this.buildRoomTypeQuery(filters).orderBy('roomType.createdAt', 'DESC');

    return this.paginateRaw<RoomTypeDetails>(query as SelectQueryBuilder<any>, {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  findRoomTypeById(id: string): Promise<RoomType | null> {
    return this.roomTypeRepository
      .createQueryBuilder('roomType')
      .where('roomType.id = :id', { id })
      .andWhere('roomType.deletedAt IS NULL')
      .getOne();
  }

  findRoomTypeByName(name: string, excludeId?: string): Promise<RoomType | null> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .where('LOWER(roomType.name) = LOWER(:name)', { name })
      .andWhere('roomType.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('roomType.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }

  async findRoomTypeCodesByPrefix(prefix: string): Promise<string[]> {
    const rows = await this.roomTypeRepository
      .createQueryBuilder('roomType')
      .withDeleted()
      .select('roomType.code', 'code')
      .where('roomType.code LIKE :pattern', { pattern: `${prefix}%` })
      .getRawMany<{ code: string }>();

    return rows.map((row) => row.code);
  }

  findRoomTypesByFacilityId(
    facilityId: string,
    filters?: LookupRoomTypesDto,
  ): Promise<FacilityRoomType[]> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .innerJoin('rooms', 'room', 'room.room_type_id = roomType.id')
      .innerJoin('facilities', 'facility', 'facility.id = room.facility_id')
      .select('roomType.id', 'id')
      .addSelect('roomType.code', 'code')
      .addSelect('roomType.name', 'name')
      .addSelect('roomType.description', 'description')
      .addSelect('roomType.status', 'status')
      .addSelect('COUNT(room.id)', 'roomCount')
      .where('room.facility_id = :facilityId', { facilityId })
      .andWhere('room.deleted_at IS NULL')
      .andWhere('room.status = :roomStatus', { roomStatus: ActiveStatus.ACTIVE })
      .andWhere('roomType.deletedAt IS NULL')
      .andWhere('facility.deleted_at IS NULL')
      .groupBy('roomType.id')
      .addGroupBy('roomType.code')
      .addGroupBy('roomType.name')
      .addGroupBy('roomType.description')
      .addGroupBy('roomType.status')
      .orderBy('roomType.name', 'ASC')
      .limit(Math.max(1, Number(filters?.limit) || 50));

    if (filters?.search) {
      query.andWhere(
        `(${[
          'CAST(roomType.id AS CHAR) LIKE :search',
          'LOWER(roomType.code) LIKE LOWER(:search)',
          'LOWER(roomType.name) LIKE LOWER(:search)',
        ].join(' OR ')})`,
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('roomType.status = :status', { status: filters.status });
    }

    return query.getRawMany<FacilityRoomType>();
  }

  lookup(filters?: LookupRoomsDto): Promise<RoomLookup[]> {
    const query = this.buildDetailsQuery({
      search: filters?.search,
      facilityId: filters?.facilityId,
      status: filters?.status,
    })
      .select('room.id', 'id')
      .addSelect('room.code', 'code')
      .addSelect('room.name', 'name')
      .addSelect('room.facilityId', 'facilityId')
      .addSelect('facility.name', 'facilityName')
      .addSelect('room.roomTypeId', 'roomTypeId')
      .addSelect('roomType.name', 'roomTypeName')
      .addSelect('room.floor', 'floor')
      .addSelect('room.status', 'status')
      .orderBy('facility.name', 'ASC')
      .addOrderBy('room.name', 'ASC')
      .limit(Math.max(1, Number(filters?.limit) || 20));

    return query.getRawMany<RoomLookup>();
  }

  lookupRoomTypes(filters?: LookupRoomTypesDto): Promise<RoomTypeLookup[]> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .select('roomType.id', 'id')
      .addSelect('roomType.code', 'code')
      .addSelect('roomType.name', 'name')
      .addSelect('roomType.description', 'description')
      .addSelect('roomType.status', 'status')
      .orderBy('roomType.name', 'ASC')
      .limit(Math.max(1, Number(filters?.limit) || 20));

    query.andWhere('roomType.deletedAt IS NULL');

    if (filters?.search) {
      query.andWhere(
        `(${[
          'CAST(roomType.id AS CHAR) LIKE :search',
          'LOWER(roomType.code) LIKE LOWER(:search)',
          'LOWER(roomType.name) LIKE LOWER(:search)',
        ].join(' OR ')})`,
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('roomType.status = :status', { status: filters.status });
    }

    return query.getRawMany<RoomTypeLookup>();
  }

  async remove(room: Room): Promise<void> {
    await this.repository.remove(room);
  }

  async removeRoomType(roomType: RoomType): Promise<void> {
    await this.roomTypeRepository.remove(roomType);
  }

  async countRoomTypeDependencies(roomTypeId: string): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('room')
      .select('COUNT(*)', 'count')
      .where('room.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('room.deletedAt IS NULL')
      .getRawOne<{ count: string }>();

    return Number(row?.count ?? 0);
  }

  async countDependencies(roomId: string): Promise<number> {
    const [shiftRow, appointmentRow] = await Promise.all([
      this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('shifts', 'shift')
        .where('shift.room_id = :roomId', { roomId })
        .getRawOne<{ count: string }>(),
      this.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('appointments', 'appointment')
        .where('appointment.room_id = :roomId', { roomId })
        .getRawOne<{ count: string }>(),
    ]);

    return Number(shiftRow?.count ?? 0) + Number(appointmentRow?.count ?? 0);
  }

  async softDelete(room: Room, reason?: string, deletedBy?: string | null): Promise<Room> {
    room.status = ActiveStatus.INACTIVE;
    room.deletedAt = new Date();
    room.deletedBy = deletedBy ?? null;
    room.deletedReason = reason ?? null;
    return this.repository.save(room);
  }

  async countSuspendImpact(roomId: string, from: Date, until?: Date | null) {
    const fromDate = from.toISOString().slice(0, 10);
    const untilDate = until ? until.toISOString().slice(0, 10) : null;
    const activeAppointmentStatuses = [
      'pending_payment',
      'booked',
      'confirmed',
      'checked_in',
      'in_progress',
    ];

    const shiftQuery = this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('shifts', 'shift')
      .where('shift.room_id = :roomId', { roomId })
      .andWhere('shift.deleted_at IS NULL')
      .andWhere('shift.status IN (:...statuses)', { statuses: ['available', 'full'] })
      .andWhere('shift.shift_date >= :fromDate', { fromDate });

    if (untilDate) {
      shiftQuery.andWhere('shift.shift_date <= :untilDate', { untilDate });
    }

    const appointmentQuery = this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('appointments', 'appointment')
      .where('appointment.room_id = :roomId', { roomId })
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
      affectedShifts: Number(shiftRow?.count ?? 0),
      affectedAppointments: Number(appointmentRow?.count ?? 0),
    };
  }

  async cancelFutureShiftsForRoom(
    roomId: string,
    from: Date,
    until?: Date | null,
    reason?: string | null,
    actorId?: string | null,
  ): Promise<number> {
    return this.repository.manager.transaction(async manager => {
      const shifts = await this.findSuspendAffectedShifts(manager, roomId, from, until);

      for (const shift of shifts) {
        const affectedAppointments = await this.findActiveAppointmentsForShift(manager, shift);

        await manager.update(Shift, shift.id, {
          status: DoctorShiftStatus.CANCELLED,
        });

        await this.insertShiftChangeLog(
          manager,
          shift,
          'room_suspended',
          reason,
          actorId,
        );

        if (affectedAppointments.length > 0) {
          await this.insertShiftDisruption(
            manager,
            shift,
            affectedAppointments,
            {
              type: 'room_suspended',
              sourceType: 'room',
              sourceId: roomId,
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
    roomId: string,
    from: Date,
    until?: Date | null,
  ): Promise<Shift[]> {
    const query = manager
      .getRepository(Shift)
      .createQueryBuilder('shift')
      .setLock('pessimistic_write')
      .where('shift.roomId = :roomId', { roomId })
      .andWhere('shift.deletedAt IS NULL')
      .andWhere('shift.status IN (:...statuses)', {
        statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL, DoctorShiftStatus.OFF],
      })
      .andWhere('shift.shiftDate >= :fromDate', { fromDate: from.toISOString().slice(0, 10) })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('shift.startTime', 'ASC');

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
      .andWhere('appointment.room_id = :roomId', { roomId: shift.roomId })
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

  findByFacilityId(facilityId: string, filters?: SearchRooms2Dto): Promise<RoomWithDetails[]> {
    return this.buildDetailsQuery({ ...filters, facilityId })
      .orderBy('room.createdAt', 'DESC')
      .getRawMany<RoomWithDetails>();
  }

  findByFacilityIdPaginated(
    facilityId: string,
    filters?: SearchRooms2Dto,
  ): Promise<PaginationResult<RoomWithDetails>> {
    const query = this.buildDetailsQuery({ ...filters, facilityId }).orderBy(
      'room.createdAt',
      'DESC',
    );

    return this.paginateRaw<RoomWithDetails>(query, { page: filters?.page, limit: filters?.limit });
  }

  private buildDetailsQuery(
    filters?: Pick<SearchRoomsDto, 'search' | 'floor' | 'status' | 'facilityId' | 'roomTypeId'>,
  ): SelectQueryBuilder<Room> {
    const query = this.repository
      .createQueryBuilder('room')
      .innerJoin('facilities', 'facility', 'facility.id = room.facilityId')
      .innerJoin('room_types', 'roomType', 'roomType.id = room.roomTypeId')
      .where('room.deletedAt IS NULL')
      .andWhere('facility.deletedAt IS NULL')
      .select('room.id', 'id')
      .addSelect('room.facilityId', 'facilityId')
      .addSelect('room.code', 'code')
      .addSelect('room.roomTypeId', 'roomTypeId')
      .addSelect('room.name', 'name')
      .addSelect('room.floor', 'floor')
      .addSelect('room.status', 'status')
      .addSelect('room.inactiveFrom', 'inactiveFrom')
      .addSelect('room.inactiveUntil', 'inactiveUntil')
      .addSelect('room.inactiveReason', 'inactiveReason')
      .addSelect('room.inactiveSource', 'inactiveSource')
      .addSelect('room.inactiveBy', 'inactiveBy')
      .addSelect('room.reactivatedAt', 'reactivatedAt')
      .addSelect('room.reactivatedBy', 'reactivatedBy')
      .addSelect('room.createdAt', 'createdAt')
      .addSelect('room.updatedAt', 'updatedAt')
      .addSelect('facility.code', 'facilityCode')
      .addSelect('facility.name', 'facilityName')
      .addSelect('facility.address', 'facilityAddress')
      .addSelect('facility.province', 'facilityProvince')
      .addSelect('facility.ward', 'facilityWard')
      .addSelect('facility.status', 'facilityStatus')
      .addSelect('roomType.name', 'roomTypeName')
      .addSelect('roomType.code', 'roomTypeCode')
      .addSelect('roomType.description', 'roomTypeDescription')
      .addSelect('roomType.status', 'roomTypeStatus');

    if (filters?.search) {
      query.andWhere(
        `(${[
          'CAST(room.id AS CHAR) LIKE :search',
          'LOWER(room.code) LIKE LOWER(:search)',
          'LOWER(room.name) LIKE LOWER(:search)',
        ].join(' OR ')})`,
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.floor) {
      query.andWhere('room.floor = :floor', { floor: filters.floor });
    }

    if (filters?.status) {
      query.andWhere('room.status = :status', { status: filters.status });
    }

    if (filters?.facilityId) {
      query.andWhere('room.facilityId = :facilityId', { facilityId: filters.facilityId });
    }

    if (filters?.roomTypeId) {
      query.andWhere('room.roomTypeId = :roomTypeId', { roomTypeId: filters.roomTypeId });
    }

    return query;
  }

  private buildRoomTypeQuery(
    filters?: Pick<SearchRoomTypesDto, 'search' | 'status'>,
  ): SelectQueryBuilder<RoomType> {
    const query = this.roomTypeRepository
      .createQueryBuilder('roomType')
      .select('roomType.id', 'id')
      .addSelect('roomType.code', 'code')
      .addSelect('roomType.name', 'name')
      .addSelect('roomType.description', 'description')
      .addSelect('roomType.status', 'status')
      .addSelect('roomType.createdAt', 'createdAt')
      .addSelect('roomType.updatedAt', 'updatedAt');

    query.where('roomType.deletedAt IS NULL');

    if (filters?.search) {
      query.andWhere(
        `(${[
          'CAST(roomType.id AS CHAR) LIKE :search',
          'LOWER(roomType.code) LIKE LOWER(:search)',
          'LOWER(roomType.name) LIKE LOWER(:search)',
        ].join(' OR ')})`,
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      query.andWhere('roomType.status = :status', { status: filters.status });
    }

    return query;
  }

  private async paginateRaw<T>(
    query: SelectQueryBuilder<any>,
    options?: { page?: number; limit?: number },
  ): Promise<PaginationResult<T>> {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const total = await query.clone().getCount();
    const items = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<T>();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
