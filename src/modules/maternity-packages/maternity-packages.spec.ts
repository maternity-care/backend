import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { MaternityPackageStatus } from '../../common/constants/status.enum';
import { CreateMaternityPackageDto } from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { MaternityPackagesController } from './maternity-packages.controller';
import { MaternityPackagesService } from './maternity-packages.service';
import { PublicFacilityMaternityPackagesController } from './public-facility-maternity-packages.controller';
import { PublicMaternityPackagesController } from './public-maternity-packages.controller';

describe('MaternityPackages DTO validation', () => {
  const validPayload = {
    code: 'PKG_BASIC',
    name: 'Gói thai sản cơ bản',
    description: 'Gói theo dõi thai kỳ cơ bản',
    price: '900000.00',
    durationDays: '90',
    priorityLevel: '1',
    status: MaternityPackageStatus.DRAFT,
  };

  it('accepts a valid create payload and transforms numeric fields', async () => {
    const dto = plainToInstance(CreateMaternityPackageDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.durationDays).toBe(90);
    expect(dto.priorityLevel).toBe(1);
  });

  it.each([
    [{ ...validPayload, code: 'bad code' }, 'code'],
    [{ ...validPayload, name: 'A' }, 'name'],
    [{ ...validPayload, price: '-1' }, 'price'],
    [{ ...validPayload, durationDays: 0 }, 'durationDays'],
    [{ ...validPayload, priorityLevel: 101 }, 'priorityLevel'],
    [{ ...validPayload, status: 'deleted' }, 'status'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateMaternityPackageDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  it('validates search filters and pagination', async () => {
    const dto = plainToInstance(SearchMaternityPackageDto, {
      status: 'deleted',
      page: '0',
      limit: '101',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['status', 'page', 'limit']),
    );
  });
});

describe('MaternityPackagesService business logic', () => {
  const packageEntity = {
    id: '1',
    code: 'PKG_BASIC',
    name: 'Gói thai sản cơ bản',
    description: 'Gói theo dõi thai kỳ cơ bản',
    price: '900000.00',
    durationDays: 90,
    priorityLevel: 1,
    status: MaternityPackageStatus.DRAFT,
  };

  const createRepo = () => ({
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async data => ({ id: data.id ?? '1', ...data })),
    remove: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue({ ...packageEntity }),
    findByCode: jest.fn().mockResolvedValue(null),
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([{ ...packageEntity }]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [{ ...packageEntity }], total: 1 }),
    findAvailableByFacilityId: jest.fn().mockResolvedValue([{
      ...packageEntity,
      facilityId: '1',
      totalServiceCount: 2,
      availableServiceCount: 2,
    }]),
    findAvailableByFacilityIdPaginated: jest.fn().mockResolvedValue({
      items: [{
        ...packageEntity,
        facilityId: '1',
        totalServiceCount: 2,
        availableServiceCount: 2,
      }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
    countDependencies: jest.fn().mockResolvedValue(0),
    updateStatus: jest.fn(async (entity, status) => ({ ...entity, status })),
  });
  const facilitiesService = {
    findById: jest.fn().mockResolvedValue({ id: '1', status: 'active' }),
  };

  const createService = (repo = createRepo()) => ({
    repo,
    service: new MaternityPackagesService(repo as never, facilitiesService as never),
  });

  beforeEach(() => jest.clearAllMocks());

  it('creates a package after checking unique code and name', async () => {
    const { repo, service } = createService();
    await expect(service.create({
      code: 'PKG_BASIC',
      name: 'Gói thai sản cơ bản',
      description: 'Gói theo dõi thai kỳ cơ bản',
      price: '900000.00',
      durationDays: 90,
      priorityLevel: 1,
      status: MaternityPackageStatus.DRAFT,
    })).resolves.toMatchObject({ id: '1', code: 'PKG_BASIC' });
    expect(repo.findByCode).toHaveBeenCalledWith('PKG_BASIC');
    expect(repo.findByName).toHaveBeenCalledWith('Gói thai sản cơ bản');
  });

  it('rejects duplicated code or name', async () => {
    const codeContext = createService();
    codeContext.repo.findByCode.mockResolvedValueOnce(packageEntity);
    await expect(codeContext.service.create(packageEntity as never)).rejects.toBeInstanceOf(ConflictException);

    const nameContext = createService();
    nameContext.repo.findByName.mockResolvedValueOnce(packageEntity);
    await expect(nameContext.service.create(packageEntity as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a package and checks duplicate fields only when changed', async () => {
    const { repo, service } = createService();
    await expect(service.update('1', { price: '850000.00' })).resolves.toMatchObject({
      price: '850000.00',
    });
    expect(repo.save).toHaveBeenCalled();
  });

  it('returns plain and paginated package lists when repository has items', async () => {
    const { repo, service } = createService();

    await expect(service.findAll({ status: MaternityPackageStatus.DRAFT })).resolves.toEqual([{ ...packageEntity }]);
    await expect(service.findAllPaginated({ page: 1, limit: 20 })).resolves.toEqual({
      items: [{ ...packageEntity }],
      total: 1,
    });
    expect(repo.findAll).toHaveBeenCalledWith({ status: MaternityPackageStatus.DRAFT });
    expect(repo.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('rejects update when changed code or name already exists', async () => {
    const codeContext = createService();
    codeContext.repo.findByCode.mockResolvedValueOnce(packageEntity);
    await expect(codeContext.service.update('1', { code: 'PKG_PREMIUM' })).rejects.toBeInstanceOf(ConflictException);
    expect(codeContext.repo.save).not.toHaveBeenCalled();

    const nameContext = createService();
    nameContext.repo.findByName.mockResolvedValueOnce(packageEntity);
    await expect(nameContext.service.update('1', { name: 'Goi thai san nang cao' })).rejects.toBeInstanceOf(ConflictException);
    expect(nameContext.repo.save).not.toHaveBeenCalled();
  });

  it('preserves existing description when update omits description', async () => {
    const { service } = createService();

    await expect(service.update('1', { price: '850000.00' })).resolves.toMatchObject({
      description: packageEntity.description,
      price: '850000.00',
    });
  });

  it('throws not found when package does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws not found when package lists are empty', async () => {
    const listContext = createService();
    listContext.repo.findAll.mockResolvedValueOnce([]);
    await expect(listContext.service.findAll({ status: MaternityPackageStatus.ACTIVE })).rejects.toBeInstanceOf(NotFoundException);

    const pagedContext = createService();
    pagedContext.repo.findAllPaginated.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    await expect(pagedContext.service.findAllPaginated({ page: 1, limit: 20 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns packages available at a facility and supports pagination', async () => {
    const { repo, service } = createService();

    await expect(service.findAvailableByFacilityId('1', { search: 'basic' })).resolves.toEqual([
      expect.objectContaining({
        facilityId: '1',
        totalServiceCount: 2,
        availableServiceCount: 2,
      }),
    ]);
    await expect(service.findAvailableByFacilityIdPaginated('1', { page: 1, limit: 20 })).resolves.toMatchObject({
      total: 1,
      items: [expect.objectContaining({ facilityId: '1' })],
    });
    expect(facilitiesService.findById).toHaveBeenCalledWith('1');
    expect(repo.findAvailableByFacilityId).toHaveBeenCalledWith('1', { search: 'basic' });
    expect(repo.findAvailableByFacilityIdPaginated).toHaveBeenCalledWith('1', { page: 1, limit: 20 });
  });

  it('throws not found when a facility has no available maternity packages', async () => {
    const plainContext = createService();
    plainContext.repo.findAvailableByFacilityId.mockResolvedValueOnce([]);
    await expect(plainContext.service.findAvailableByFacilityId('1')).rejects.toBeInstanceOf(NotFoundException);

    const pagedContext = createService();
    pagedContext.repo.findAvailableByFacilityIdPaginated.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    await expect(pagedContext.service.findAvailableByFacilityIdPaginated('1', { page: 1 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws not found when facility is inactive before checking available packages', async () => {
    facilitiesService.findById.mockResolvedValueOnce({ id: '1', status: 'inactive' });
    const { repo, service } = createService();

    await expect(service.findAvailableByFacilityId('1')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findAvailableByFacilityId).not.toHaveBeenCalled();
  });

  it('hard deletes unused package and marks used package inactive', async () => {
    const hardContext = createService();
    await expect(hardContext.service.remove('1')).resolves.toEqual({
      action: 'hard_deleted',
      affectedCount: 0,
    });
    expect(hardContext.repo.remove).toHaveBeenCalled();

    const softContext = createService();
    softContext.repo.countDependencies.mockResolvedValueOnce(2);
    await expect(softContext.service.remove('1')).resolves.toEqual({
      action: 'soft_deleted',
      affectedCount: 2,
    });
    expect(softContext.repo.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
      MaternityPackageStatus.INACTIVE,
    );
  });
});

describe('PublicMaternityPackagesController', () => {
  const activePackage = {
    id: '1',
    status: MaternityPackageStatus.ACTIVE,
  };

  it('forces public list status to active and supports pagination', async () => {
    const service = {
      findAll: jest.fn().mockResolvedValue([activePackage]),
      findAllPaginated: jest.fn().mockResolvedValue({ items: [activePackage], total: 1 }),
    };
    const controller = new PublicMaternityPackagesController(service as never);
    const plainQuery = {} as SearchMaternityPackageDto;
    const pagedQuery = { page: 1 } as SearchMaternityPackageDto;

    await expect(controller.findAll(plainQuery)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: [activePackage],
    });
    await expect(controller.findAll(pagedQuery)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: { total: 1 },
    });
    expect(plainQuery.status).toBe(MaternityPackageStatus.ACTIVE);
    expect(pagedQuery.status).toBe(MaternityPackageStatus.ACTIVE);
  });

  it('returns active package detail', async () => {
    const service = {
      findById: jest.fn().mockResolvedValue(activePackage),
    };
    const controller = new PublicMaternityPackagesController(service as never);

    await expect(controller.findOne('1')).resolves.toEqual({
      message: MATERNITY_PACKAGE_CONSTANT.DETAIL_FOUND,
      data: activePackage,
    });
  });

  it('throws not found instead of returning success with null when package is not active', async () => {
    const service = {
      findById: jest.fn().mockResolvedValue({
        id: '1',
        status: MaternityPackageStatus.DRAFT,
      }),
    };
    const controller = new PublicMaternityPackagesController(service as never);

    await expect(controller.findOne('1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PublicFacilityMaternityPackagesController', () => {
  const availablePackage = {
    id: '1',
    facilityId: '1',
    status: MaternityPackageStatus.ACTIVE,
    totalServiceCount: 2,
    availableServiceCount: 2,
  };

  const createServiceMock = () => ({
    findAvailableByFacilityId: jest.fn().mockResolvedValue([availablePackage]),
    findAvailableByFacilityIdPaginated: jest.fn().mockResolvedValue({
      items: [availablePackage],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
  });

  it('lists packages available at a facility', async () => {
    const service = createServiceMock();
    const controller = new PublicFacilityMaternityPackagesController(service as never);

    await expect(controller.findAvailablePackagesByFacility('1', {} as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: [availablePackage],
    });
    expect(service.findAvailableByFacilityId).toHaveBeenCalledWith('1', {});
  });

  it('uses paginated service when query.page is present', async () => {
    const service = createServiceMock();
    const controller = new PublicFacilityMaternityPackagesController(service as never);

    await expect(controller.findAvailablePackagesByFacility('1', { page: 1 } as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: { total: 1 },
    });
    expect(service.findAvailableByFacilityIdPaginated).toHaveBeenCalledWith('1', { page: 1 });
  });
});

describe('MaternityPackagesController', () => {
  const packageEntity = {
    id: '1',
    code: 'PKG_BASIC',
    name: 'Goi thai san co ban',
    price: '900000.00',
    durationDays: 90,
    priorityLevel: 1,
    status: MaternityPackageStatus.DRAFT,
  };

  const createServiceMock = () => ({
    create: jest.fn().mockResolvedValue(packageEntity),
    findAll: jest.fn().mockResolvedValue([packageEntity]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [packageEntity], total: 1 }),
    findById: jest.fn().mockResolvedValue(packageEntity),
    update: jest.fn().mockResolvedValue({ ...packageEntity, price: '850000.00' }),
    remove: jest.fn().mockResolvedValue({ action: 'hard_deleted', affectedCount: 0 }),
  });

  it('chooses list method by query.page and wraps response', async () => {
    const service = createServiceMock();
    const controller = new MaternityPackagesController(service as never);

    await expect(controller.findAll({ page: 1 } as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: { total: 1 },
    });
    await expect(controller.findAll({} as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: [packageEntity],
    });
  });

  it('wraps detail, create, update, and remove responses', async () => {
    const service = createServiceMock();
    const controller = new MaternityPackagesController(service as never);

    await expect(controller.findOne('1')).resolves.toMatchObject({ message: MATERNITY_PACKAGE_CONSTANT.DETAIL_FOUND });
    await expect(controller.create(packageEntity as never)).resolves.toMatchObject({ message: MATERNITY_PACKAGE_CONSTANT.CREATED });
    await expect(controller.update('1', { price: '850000.00' })).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.UPDATED,
      data: { price: '850000.00' },
    });
    await expect(controller.remove('1')).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.DELETED,
      data: { action: 'hard_deleted' },
    });
  });
});
