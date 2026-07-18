import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ActiveStatus,
  AvailabilityStatus,
  MaternityPackageStatus,
} from '../../../common/constants/status.enum';
import { paginate } from '../../../common/helpers/pagination';
import { searchBuilder } from '../../../common/helpers/search-builder';
import { MaternityPackage } from '../entities/maternity-packages.entity';
import { SearchMaternityPackageDto } from '../dto/requests/search-maternity-package.dto';
import { AvailableMaternityPackageResponseDto } from '../dto/responses/available-maternity-package-response.dto';
import { IMaternityPackagesRepository } from '../interfaces/maternity-packages-repository.interface';

@Injectable()
export class MaternityPackagesRepository implements IMaternityPackagesRepository {
  constructor(
    // Repository TypeORM thao tác với bảng maternity_packages.
    @InjectRepository(MaternityPackage)
    private readonly repository: Repository<MaternityPackage>,
  ) {}

  // Tạo entity trong memory, chưa ghi DB cho tới khi gọi save().
  create(data: DeepPartial<MaternityPackage>): MaternityPackage {
    return this.repository.create(data);
  }

  // Lưu gói xuống DB; TypeORM tự insert/update theo id.
  save(entity: MaternityPackage): Promise<MaternityPackage> {
    return this.repository.save(entity);
  }

  // Hard delete gói; chỉ dùng khi chưa phát sinh package_services/patient_packages.
  async remove(entity: MaternityPackage): Promise<void> {
    await this.repository.remove(entity);
  }

  // Tìm gói theo id.
  findById(id: string): Promise<MaternityPackage | null> {
    return this.repository.findOne({ where: { id } });
  }

  // Tìm theo code để chống trùng mã gói.
  findByCode(code: string): Promise<MaternityPackage | null> {
    return this.repository.findOne({ where: { code } });
  }

  // Tìm theo name để tránh tạo nhiều gói cùng tên gây rối cho người dùng.
  findByName(name: string): Promise<MaternityPackage | null> {
    return this.repository.findOne({ where: { name } });
  }

  // Danh sách không phân trang.
  findAll(filters?: SearchMaternityPackageDto): Promise<MaternityPackage[]> {
    return this.buildListQuery(filters).getMany();
  }

  // Danh sách có phân trang cho màn hình quản trị.
  findAllPaginated(filters?: SearchMaternityPackageDto) {
    return paginate(this.buildListQuery(filters), {
      page: filters?.page,
      limit: filters?.limit,
    });
  }

  // Public theo facility: chỉ trả các gói active mà toàn bộ service con đều available tại cơ sở đó.
  findAvailableByFacilityId(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ): Promise<AvailableMaternityPackageResponseDto[]> {
    return this.buildAvailableByFacilityQuery(facilityId, filters)
      .getRawMany<AvailableMaternityPackageResponseDto>()
      .then(rows => this.normalizeAvailablePackageRows(rows));
  }

  // Bản phân trang của API gói khả dụng theo facility.
  async findAvailableByFacilityIdPaginated(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ) {
    return this.paginateRaw<AvailableMaternityPackageResponseDto>(
      this.buildAvailableByFacilityQuery(facilityId, filters),
      { page: filters?.page, limit: filters?.limit },
    );
  }

  // Đếm dữ liệu phụ thuộc để quyết định hard delete hay chuyển inactive.
  async countDependencies(packageId: string): Promise<number> {
    const tables = [
      { table: 'package_services', column: 'package_id' },
      { table: 'patient_packages', column: 'package_id' },
    ];

    const rows = await Promise.all(tables.map(item => this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(item.table, item.table)
      .where(`${item.table}.${item.column} = :packageId`, { packageId })
      .getRawOne<{ count: string }>()));

    return rows.reduce((total, row) => total + Number(row?.count ?? 0), 0);
  }

  // Chuyển trạng thái gói, dùng khi delete an toàn với gói đã có lịch sử.
  updateStatus(entity: MaternityPackage, status: MaternityPackageStatus): Promise<MaternityPackage> {
    entity.status = status;
    return this.repository.save(entity);
  }

  // Query chung cho list thường và list phân trang.
  private buildListQuery(filters?: SearchMaternityPackageDto): SelectQueryBuilder<MaternityPackage> {
    const query = this.repository.createQueryBuilder('pkg');

    searchBuilder(query, filters?.search, {
      columns: ['code', 'name', 'description'],
    });

    if (filters?.status) {
      query.andWhere('pkg.status = :status', { status: filters.status });
    }

    return query
      .orderBy('pkg.priorityLevel', 'DESC')
      .addOrderBy('pkg.createdAt', 'DESC');
  }

  private buildAvailableByFacilityQuery(
    facilityId: string,
    filters?: SearchMaternityPackageDto,
  ): SelectQueryBuilder<MaternityPackage> {
    const query = this.repository
      .createQueryBuilder('pkg')
      .innerJoin('package_services', 'packageService', 'packageService.package_id = pkg.id')
      .innerJoin('services', 'service', 'service.id = packageService.service_id')
      .leftJoin(
        'facility_services',
        'facilityService',
        [
          'facilityService.facility_id = :facilityId',
          'facilityService.service_id = packageService.service_id',
          'facilityService.status = :available',
        ].join(' AND '),
        { facilityId, available: AvailabilityStatus.AVAILABLE },
      )
      .leftJoin(
        'package_service_facilities',
        'packageServiceFacility',
        [
          'packageServiceFacility.package_service_id = packageService.id',
          'packageServiceFacility.facility_id = :facilityId',
        ].join(' AND '),
        { facilityId },
      )
      .select('pkg.id', 'id')
      .addSelect('pkg.code', 'code')
      .addSelect('pkg.name', 'name')
      .addSelect('pkg.description', 'description')
      .addSelect('pkg.price', 'price')
      .addSelect('pkg.duration_days', 'durationDays')
      .addSelect('pkg.priority_level', 'priorityLevel')
      .addSelect('pkg.status', 'status')
      .addSelect('pkg.created_at', 'createdAt')
      .addSelect('pkg.updated_at', 'updatedAt')
      .addSelect(':facilityId', 'facilityId')
      .addSelect('COUNT(DISTINCT packageService.id)', 'totalServiceCount')
      .addSelect(
        [
          'COUNT(DISTINCT CASE WHEN service.status = :serviceActive',
          'AND facilityService.id IS NOT NULL',
          "AND (packageService.allowed_facility_scope = 'all' OR packageServiceFacility.facility_id IS NOT NULL)",
          'THEN packageService.id END)',
        ].join(' '),
        'availableServiceCount',
      )
      .where('pkg.status = :packageActive', { packageActive: MaternityPackageStatus.ACTIVE })
      .setParameter('serviceActive', ActiveStatus.ACTIVE)
      .groupBy('pkg.id')
      .having('COUNT(DISTINCT packageService.id) > 0')
      .andHaving(
        [
          'COUNT(DISTINCT packageService.id) = COUNT(DISTINCT CASE WHEN service.status = :serviceActive',
          'AND facilityService.id IS NOT NULL',
          "AND (packageService.allowed_facility_scope = 'all' OR packageServiceFacility.facility_id IS NOT NULL)",
          'THEN packageService.id END)',
        ].join(' '),
      )
      .orderBy('pkg.priority_level', 'DESC')
      .addOrderBy('pkg.created_at', 'DESC');

    if (filters?.search) {
      query.andWhere(
        '(LOWER(pkg.code) LIKE LOWER(:search) OR LOWER(pkg.name) LIKE LOWER(:search) OR LOWER(pkg.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }

  private async paginateRaw<T>(
    query: SelectQueryBuilder<MaternityPackage>,
    options?: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const totalRows = await query.clone()
      .select('pkg.id', 'id')
      .orderBy()
      .offset(undefined)
      .limit(undefined)
      .getRawMany<{ id: string }>();
    const items = await query.offset((page - 1) * limit).limit(limit).getRawMany<T>();

    return {
      items: this.normalizeAvailablePackageRows(items as AvailableMaternityPackageResponseDto[]) as T[],
      total: totalRows.length,
      page,
      limit,
      totalPages: Math.ceil(totalRows.length / limit),
    };
  }

  private normalizeAvailablePackageRows(
    rows: AvailableMaternityPackageResponseDto[],
  ): AvailableMaternityPackageResponseDto[] {
    return rows.map(row => ({
      ...row,
      totalServiceCount: Number(row.totalServiceCount ?? 0),
      availableServiceCount: Number(row.availableServiceCount ?? 0),
    }));
  }
}
