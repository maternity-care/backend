import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { MaternityPackageStatus } from '../../../common/constants/status.enum';
import { MaternityPackage } from '../entities/maternity-package.entity';
import { SearchMaternityPackageDto } from '../dto/requests/search-maternity-package.dto';
import { MaternityPackageResponseDto } from '../dto/responses/maternity-package-response.dto';
import { PackageItem } from '../../package-services/entities/package-item.entity';

export const MATERNITY_PACKAGES_REPOSITORY = Symbol('MATERNITY_PACKAGES_REPOSITORY');

export interface IMaternityPackagesRepository {
  create(data: DeepPartial<MaternityPackage>): MaternityPackage;
  save(entity: MaternityPackage): Promise<MaternityPackage>;
  saveWithItems(entity: MaternityPackage, items?: DeepPartial<PackageItem>[]): Promise<MaternityPackage>;
  replaceItems(packageId: string, items?: DeepPartial<PackageItem>[]): Promise<void>;
  remove(entity: MaternityPackage): Promise<void>;
  findById(id: string): Promise<MaternityPackage | null>;
  findDetailsById(id: string): Promise<MaternityPackageResponseDto | null>;
  findByCode(code: string): Promise<MaternityPackage | null>;
  findByName(name: string): Promise<MaternityPackage | null>;
  findByFacilityAndCode(facilityId: string, code: string): Promise<MaternityPackage | null>;
  findByFacilityAndName(facilityId: string, name: string): Promise<MaternityPackage | null>;
  findAll(filters?: SearchMaternityPackageDto): Promise<MaternityPackageResponseDto[]>;
  findAllPaginated(filters?: SearchMaternityPackageDto): Promise<PaginationResult<MaternityPackageResponseDto>>;
  findAvailableByFacilityId(facilityId: string, filters?: SearchMaternityPackageDto): Promise<MaternityPackageResponseDto[]>;
  findAvailableByFacilityIdPaginated(facilityId: string, filters?: SearchMaternityPackageDto): Promise<PaginationResult<MaternityPackageResponseDto>>;
  countDependencies(packageId: string): Promise<number>;
  updateStatus(entity: MaternityPackage, status: MaternityPackageStatus): Promise<MaternityPackage>;
}
