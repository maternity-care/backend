import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { MaternityPackageStatus } from '../../../common/constants/status.enum';
import { paginate } from '../../../common/helpers/pagination';
import { searchBuilder } from '../../../common/helpers/search-builder';
import { MaternityPackage } from '../../../database/entities/maternity-packages.entity';
import { SearchMaternityPackageDto } from '../dto/requests/search-maternity-package.dto';
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
}
