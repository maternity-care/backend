import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Facility } from '../entities/facility.entity';
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
import { ShiftSlot } from '../../../database/entities/shift-slot.entity';
import {
  FacilityAdminOption,
  FacilityLookup,
  FacilityWithDetails,
  IFacilitiesRepository,
} from '../interfaces/facility-repository.interface';

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
  ) {}

  create(data: DeepPartial<Facility>): Facility {
    return this.repository.create(data);
  }

  save(facility: Facility): Promise<Facility> {
    return this.repository.save(facility);
  }

  async findAllPaginated(filters?: SearchFacilityDto): Promise<PaginationResult<FacilityWithDetails>> {
    const query = this.buildDetailsQuery(filters)
      .orderBy('facility.createdAt', 'DESC');

    return this.paginateRaw<FacilityWithDetails>(query, {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  //tìm theo id
  findById(id: string): Promise<Facility | null> {
    return this.repository
      .createQueryBuilder('facility')
      .where('facility.id = :id', { id })
      .andWhere('facility.deletedAt IS NULL')
      .getOne();
  }

  //tìm theo id và trả về chi tiết
  async findDetailsById(id: string): Promise<FacilityWithDetails | null> {
    return (await this.buildDetailsQuery()
      .andWhere('facility.id = :id', { id })
      .getRawOne<FacilityWithDetails>()) ?? null;
  }

  //
  findByCode(code: string): Promise<Facility | null> {
    return this.repository.findOne({ where: { code } });
  }

  //prefix: là tiền tố của facility code, ví dụ: "FAC"
  // => tìm tất cả các facility có code bắt đầu bằng "FAC-"
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

  //kiếm tra xem ownerId có phải là admin đang active hay không
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

  // tìm các tùy chọn admin cho facility
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
      // subquery to count the number of facilities owned by the staff member
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
