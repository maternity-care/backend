import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ActiveStatus,
  FacilityStatus,
  MaternityPackageStatus,
} from '../../common/constants/status.enum';
import { PACKAGE_SERVICE_CONSTANT } from '../../common/constants/package-service.constant';
import {
  CreatePackageServiceDto,
  PackageServiceFacilityScope,
} from './dto/requests/create-package-service.dto';
import { SearchPackageServiceDto } from './dto/requests/search-package-service.dto';
import { PackageServicesController } from './package-services.controller';
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
    findDetailsById: jest.fn().mockResolvedValue({ ...entity, serviceName: 'SiÃªu Ã¢m' }),
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

  it('rejects selected facility scope without facility ids or with inactive facilities', async () => {
    await expect(createService().service.create({
      packageId: '1',
      serviceId: '2',
      includedQuantity: 1,
      isRequired: true,
      isOptional: false,
      allowedFacilityScope: PackageServiceFacilityScope.SELECTED,
      facilityIds: [],
    })).rejects.toBeInstanceOf(ConflictException);

    facilitiesService.findById.mockResolvedValueOnce({ ...facility, status: FacilityStatus.INACTIVE });
    await expect(createService().service.create({
      packageId: '1',
      serviceId: '2',
      includedQuantity: 1,
      isRequired: true,
      isOptional: false,
      allowedFacilityScope: PackageServiceFacilityScope.SELECTED,
      facilityIds: ['3'],
    })).rejects.toBeInstanceOf(ConflictException);
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

  it('updates package/service pair when unique and rejects duplicated pair', async () => {
    const uniqueContext = createService();
    await expect(uniqueContext.service.update('10', { serviceId: '3' })).resolves.toMatchObject({
      serviceId: '3',
    });
    expect(uniqueContext.repo.findByPackageAndService).toHaveBeenCalledWith('1', '3');

    const duplicateContext = createService();
    duplicateContext.repo.findByPackageAndService.mockResolvedValueOnce({ ...entity, id: '99' });
    await expect(duplicateContext.service.update('10', { serviceId: '3' })).rejects.toBeInstanceOf(ConflictException);
    expect(duplicateContext.repo.saveWithFacilities).not.toHaveBeenCalled();
  });

  it('converts optional flags during update', async () => {
    const { service } = createService();

    await expect(service.update('10', { isRequired: false, isOptional: true })).resolves.toMatchObject({
      isRequired: 0,
      isOptional: 1,
    });
  });

  it('returns detail records and throws when detail does not exist', async () => {
    const { service } = createService();
    await expect(service.findDetailsById('10')).resolves.toMatchObject({ serviceName: 'SiÃªu Ã¢m' });

    const missingContext = createService();
    missingContext.repo.findDetailsById.mockResolvedValueOnce(null);
    await expect(missingContext.service.findDetailsById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws not found when package service does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws not found when package service lists are empty', async () => {
    const listContext = createService();
    listContext.repo.findAll.mockResolvedValueOnce([]);
    await expect(listContext.service.findAll({ packageId: '1' })).rejects.toBeInstanceOf(NotFoundException);

    const pagedContext = createService();
    pagedContext.repo.findAllPaginated.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    await expect(pagedContext.service.findAllPaginated({ page: 1, limit: 20 })).rejects.toBeInstanceOf(NotFoundException);

    const publicContext = createService();
    publicContext.repo.findDetailsByPackageId.mockResolvedValueOnce([]);
    await expect(publicContext.service.findDetailsByPackageId('1')).rejects.toBeInstanceOf(NotFoundException);
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

describe('PackageServicesController', () => {
  const entity = {
    id: '10',
    packageId: '1',
    serviceId: '2',
    includedQuantity: 2,
    isRequired: 1,
    isOptional: 0,
    allowedFacilityScope: PackageServiceFacilityScope.ALL,
  };

  const createServiceMock = () => ({
    create: jest.fn().mockResolvedValue(entity),
    findAll: jest.fn().mockResolvedValue([entity]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [entity], total: 1 }),
    findDetailsById: jest.fn().mockResolvedValue({ ...entity, serviceName: 'Sieu am' }),
    update: jest.fn().mockResolvedValue({ ...entity, includedQuantity: 3 }),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  it('chooses list method by query.page and wraps response', async () => {
    const service = createServiceMock();
    const controller = new PackageServicesController(service as never);

    await expect(controller.findAll({ page: 1 } as never)).resolves.toMatchObject({
      message: PACKAGE_SERVICE_CONSTANT.FOUND,
      data: { total: 1 },
    });
    await expect(controller.findAll({} as never)).resolves.toMatchObject({
      message: PACKAGE_SERVICE_CONSTANT.FOUND,
      data: [entity],
    });
  });

  it('wraps detail, create, update, and remove responses', async () => {
    const service = createServiceMock();
    const controller = new PackageServicesController(service as never);

    await expect(controller.findOne('10')).resolves.toMatchObject({ message: PACKAGE_SERVICE_CONSTANT.DETAIL_FOUND });
    await expect(controller.create(entity as never)).resolves.toMatchObject({ message: PACKAGE_SERVICE_CONSTANT.CREATED, data: entity });
    await expect(controller.update('10', { includedQuantity: 3 })).resolves.toMatchObject({
      message: PACKAGE_SERVICE_CONSTANT.UPDATED,
      data: { includedQuantity: 3 },
    });
    await expect(controller.remove('10')).resolves.toEqual({
      message: PACKAGE_SERVICE_CONSTANT.DELETED,
      data: null,
    });
  });
});
