import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { Facility } from '../entities/facility.entity';
import { AccountStatus, FacilityStatus } from '../../../common/constants/status.enum';
import {
  FacilityLookup,
  FacilityWithDetails,
  IFacilitiesRepository,
} from '../interfaces/facility-repository.interface';
import { LookupFacilityDto, SearchFacilityDto } from '../dto/requests/search-facility.dto';
import { PaginationResult } from '../../../common/helpers/pagination';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';

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
    await this.repository.remove(facility);
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

    const rows = await Promise.all(tables.map(item => this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(item.table, item.table)
      .where(`${item.table}.${item.column} = :facilityId`, { facilityId })
      .getRawOne<{ count: string }>()));

    return rows.reduce((total, row) => total + Number(row?.count ?? 0), 0);
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
      throw new Error(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
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
      .addSelect('facility.openTime', 'openTime')
      .addSelect('facility.closeTime', 'closeTime')
      .addSelect('facility.workingDays', 'workingDays')
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
}
