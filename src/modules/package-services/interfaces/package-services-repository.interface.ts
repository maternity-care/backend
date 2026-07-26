import { DeepPartial } from 'typeorm';
import { SearchPackageServiceDto } from '../dto/requests/search-package-service.dto';
import { PackageServiceResponseDto } from '../dto/responses/package-service-response.dto';
import { PackageItem } from '../entities/package-item.entity';

export const PACKAGE_SERVICES_REPOSITORY = Symbol('PACKAGE_SERVICES_REPOSITORY');

export type PackageServiceWithDetails = PackageServiceResponseDto;

export interface IPackageServicesRepository {
  create(data: DeepPartial<PackageItem>): PackageItem;
  save(entity: PackageItem): Promise<PackageItem>;
  saveWithFacilities(entity: PackageItem, facilityIds?: string[]): Promise<PackageItem>;
  replaceFacilities(packageServiceId: string, facilityIds: string[]): Promise<void>;
  remove(entity: PackageItem): Promise<void>;
  findById(id: string): Promise<PackageItem | null>;
  findDetailsById(id: string): Promise<PackageServiceWithDetails | null>;
  findByPackageAndService(packageId: string, facilityServiceId: string): Promise<PackageItem | null>;
  findAll(filters?: SearchPackageServiceDto): Promise<PackageServiceWithDetails[]>;
  findDetailsByPackageId?(packageId: string): Promise<PackageServiceWithDetails[]>;
  findFacilityIds(packageServiceId: string): Promise<string[]>;
  countGeneratedBenefits(packageId: string, facilityServiceId: string): Promise<number>;
  findAllPaginated(
    filters?: SearchPackageServiceDto,
  ): Promise<{ items: PackageServiceWithDetails[]; total: number }>;
}
