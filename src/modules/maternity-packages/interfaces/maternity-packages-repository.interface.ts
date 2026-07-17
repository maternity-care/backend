import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { MaternityPackageStatus } from '../../../common/constants/status.enum';
import { MaternityPackage } from '../../../database/entities/maternity-packages.entity';
import { SearchMaternityPackageDto } from '../dto/requests/search-maternity-package.dto';

export const MATERNITY_PACKAGES_REPOSITORY = Symbol('MATERNITY_PACKAGES_REPOSITORY');

export interface IMaternityPackagesRepository {
  create(data: DeepPartial<MaternityPackage>): MaternityPackage;
  save(entity: MaternityPackage): Promise<MaternityPackage>;
  remove(entity: MaternityPackage): Promise<void>;
  findById(id: string): Promise<MaternityPackage | null>;
  findByCode(code: string): Promise<MaternityPackage | null>;
  findByName(name: string): Promise<MaternityPackage | null>;
  findAll(filters?: SearchMaternityPackageDto): Promise<MaternityPackage[]>;
  findAllPaginated(filters?: SearchMaternityPackageDto): Promise<PaginationResult<MaternityPackage>>;
  countDependencies(packageId: string): Promise<number>;
  updateStatus(entity: MaternityPackage, status: MaternityPackageStatus): Promise<MaternityPackage>;
}
