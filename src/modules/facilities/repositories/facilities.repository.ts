import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { Facility } from '../entities/facility.entity';
import { FacilityClosureDay } from '../entities/facility-closure-day.entity';
import { FacilityDayOfWeek, FacilityOperatingHour } from '../entities/facility-operating-hour.entity';
import { AccountStatus, DoctorShiftStatus, FacilityStatus } from '../../../common/constants/status.enum';
import {
  FacilityShiftScheduleViolation,
  FacilityLookup,
  FacilityWithDetails,
  IFacilitiesRepository,
} from '../interfaces/facility-repository.interface';
import { SearchFacilityClosureDayDto } from '../dto/requests/facility-closure-day.dto';
import { LookupFacilityDto, SearchFacilityDto } from '../dto/requests/search-facility.dto';
import { PaginationResult } from '../../../common/helpers/pagination';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';

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
      .where('staff.id = :ownerId', { ownerId })
      .andWhere('staff.status = :status', { status: AccountStatus.ACTIVE })
      .getRawOne<{ count: string }>();

    return Number(count?.count ?? 0) > 0;
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

  async deActivateFacility(id: string): Promise<Facility> {
    return this.updateStatus(id, FacilityStatus.INACTIVE);
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
