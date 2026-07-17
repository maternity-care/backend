import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ActiveStatus,
  FacilityStatus,
  MaternityPackageStatus,
} from '../../common/constants/status.enum';
import {
  CreatePackageServiceDto,
  PackageServiceFacilityScope,
} from './dto/requests/create-package-service.dto';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { PackageServicesService } from './package-services.service';

describe('PackageServices DTO validation', () => {
  const validPayload = {
    packageId: '1',
    serviceId: '2',
    includedQuantity: '2',
    isRequired: 'true',
    isOptional: 'false',
    allowedFacilityScope: PackageServiceFacilityScope.SELECTED,
    facilityIds: ['1', '2'],
  };

  it('accepts a valid create payload and transforms primitive fields', async () => {
    const dto = plainToInstance(CreatePackageServiceDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.includedQuantity).toBe(2);
    expect(dto.isRequired).toBe(true);
    expect(dto.isOptional).toBe(false);
  });

  it.each([
    [{ ...validPayload, packageId: '0' }, 'packageId'],
    [{ ...validPayload, serviceId: '-1' }, 'serviceId'],
    [{ ...validPayload, includedQuantity: 0 }, 'includedQuantity'],
    [{ ...validPayload, isRequired: 'not-boolean' }, 'isRequired'],
    [{ ...validPayload, allowedFacilityScope: 'facility' }, 'allowedFacilityScope'],
    [{ ...validPayload, facilityIds: [] }, 'facilityIds'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreatePackageServiceDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  it('validates search filters and pagination', async () => {
    const dto = plainToInstance(SearchPackageServiceDto, {
      packageId: '0',
      allowedFacilityScope: 'bad',
      page: '0',
      limit: '101',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['packageId', 'allowedFacilityScope', 'page', 'limit']),
    );
  });
});

describe('PackageServicesService business logic', () => {
  const pkg = { id: '1', status: MaternityPackageStatus.DRAFT };
  const serviceEntity = { id: '2', status: ActiveStatus.ACTIVE };
  const facility = { id: '3', status: FacilityStatus.ACTIVE };
  const entity = {
    id: '10',
    packageId: '1',
    serviceId: '2',
    includedQuantity: 2,
    isRequired: 1,
    isOptional: 0,
    allowedFacilityScope: PackageServiceFacilityScope.ALL,
  };

  const createRepo = () => ({
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async data => ({ id: data.id ?? '10', ...data })),
    saveWithFacilities: jest.fn(async data => ({ id: data.id ?? '10', ...data })),
    replaceFacilities: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue({ ...entity }),
    findByPackageAndService: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([{ ...entity }]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [{ ...entity }], total: 1 }),
    findDetailsByPackageId: jest.fn().mockResolvedValue([{ ...entity, serviceName: 'Siêu âm' }]),
    findFacilityIds: jest.fn().mockResolvedValue([]),
    countGeneratedBenefits: jest.fn().mockResolvedValue(0),
  });
  const maternityPackagesService = { findById: jest.fn().mockResolvedValue(pkg) };
  const servicesService = { findById: jest.fn().mockResolvedValue(serviceEntity) };
  const facilitiesService = { findById: jest.fn().mockResolvedValue(facility) };

  const createService = (repo = createRepo()) => ({
    repo,
    service: new PackageServicesService(
      repo as never,
      maternityPackagesService as never,
      servicesService as never,
      facilitiesService as never,
    ),
  });

  beforeEach(() => jest.clearAllMocks());

  it('adds a service to a package and converts boolean flags to numbers', async () => {
    const { repo, service } = createService();
    await expect(service.create({
      packageId: '1',
      serviceId: '2',
      includedQuantity: 2,
      isRequired: true,
      isOptional: false,
      allowedFacilityScope: PackageServiceFacilityScope.ALL,
    })).resolves.toMatchObject({ id: '10', isRequired: 1, isOptional: 0 });
    expect(repo.findByPackageAndService).toHaveBeenCalledWith('1', '2');
    expect(repo.saveWithFacilities).toHaveBeenCalled();
  });

  it('allows selected facility scope when all facilities are active', async () => {
    const { service } = createService();
    await expect(service.create({
      packageId: '1',
      serviceId: '2',
      includedQuantity: 1,
      isRequired: true,
      isOptional: false,
      allowedFacilityScope: PackageServiceFacilityScope.SELECTED,
      facilityIds: ['3'],
    })).resolves.toMatchObject({ id: '10' });
    expect(facilitiesService.findById).toHaveBeenCalledWith('3');
  });

  it('rejects duplicated package-service pair and inactive references', async () => {
    const duplicateContext = createService();
    duplicateContext.repo.findByPackageAndService.mockResolvedValueOnce(entity);
    await expect(duplicateContext.service.create({
      packageId: '1',
      serviceId: '2',
      includedQuantity: 1,
      isRequired: true,
      isOptional: false,
      allowedFacilityScope: PackageServiceFacilityScope.ALL,
    })).rejects.toBeInstanceOf(ConflictException);

    maternityPackagesService.findById.mockResolvedValueOnce({ ...pkg, status: MaternityPackageStatus.INACTIVE });
    await expect(createService().service.create({
      packageId: '1',
      serviceId: '2',
      includedQuantity: 1,
      isRequired: true,
      isOptional: false,
      allowedFacilityScope: PackageServiceFacilityScope.ALL,
    })).rejects.toBeInstanceOf(ConflictException);

    servicesService.findById.mockResolvedValueOnce({ ...serviceEntity, status: ActiveStatus.INACTIVE });
    await expect(createService().service.create({
      packageId: '1',
      serviceId: '2',
      includedQuantity: 1,
      isRequired: true,
      isOptional: false,
      allowedFacilityScope: PackageServiceFacilityScope.ALL,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates package service and keeps existing selected facility ids when omitted', async () => {
    const { repo, service } = createService();
    repo.findById.mockResolvedValueOnce({
      ...entity,
      allowedFacilityScope: PackageServiceFacilityScope.SELECTED,
    });
    repo.findFacilityIds.mockResolvedValueOnce(['3']);
    await expect(service.update('10', { includedQuantity: 3 })).resolves.toMatchObject({
      includedQuantity: 3,
    });
    expect(repo.saveWithFacilities).toHaveBeenCalledWith(
      expect.objectContaining({ includedQuantity: 3 }),
      ['3'],
    );
  });

  it('throws not found when package service does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes unused package service and rejects deletion after benefits are generated', async () => {
    const hardContext = createService();
    await expect(hardContext.service.remove('10')).resolves.toBeUndefined();
    expect(hardContext.repo.remove).toHaveBeenCalled();

    const usedContext = createService();
    usedContext.repo.countGeneratedBenefits.mockResolvedValueOnce(2);
    await expect(usedContext.service.remove('10')).rejects.toBeInstanceOf(ConflictException);
  });
});
