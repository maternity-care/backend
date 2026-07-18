import { DeepPartial } from 'typeorm';
import { PaginationResult } from '../../../common/helpers/pagination';
import { PackageService } from '../entities/package-services.entity';
import { SearchPackageServiceDto } from '../dto/requests/search-package-service.dto';
import { PackageServiceResponseDto } from '../dto/responses/package-service-response.dto';

export const PACKAGE_SERVICES_REPOSITORY = Symbol('PACKAGE_SERVICES_REPOSITORY');

export type PackageServiceWithDetails = PackageServiceResponseDto;

export interface IPackageServicesRepository {
  create(data: DeepPartial<PackageService>): PackageService;
  save(entity: PackageService): Promise<PackageService>;
  saveWithFacilities(entity: PackageService, facilityIds?: string[]): Promise<PackageService>;
  replaceFacilities(packageServiceId: string, facilityIds: string[]): Promise<void>;
  remove(entity: PackageService): Promise<void>;
  findById(id: string): Promise<PackageService | null>;
  findDetailsById(id: string): Promise<PackageServiceWithDetails | null>;
  findByPackageAndService(packageId: string, serviceId: string): Promise<PackageService | null>;
  findAll(filters?: SearchPackageServiceDto): Promise<PackageServiceWithDetails[]>;
  findAllPaginated(filters?: SearchPackageServiceDto): Promise<PaginationResult<PackageServiceWithDetails>>;
  findDetailsByPackageId(packageId: string, filters?: SearchPackageServiceDto): Promise<PackageServiceWithDetails[]>;
  findFacilityIds(packageServiceId: string): Promise<string[]>;
  countGeneratedBenefits(packageId: string, serviceId: string): Promise<number>;
}
