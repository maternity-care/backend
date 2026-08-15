import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ActiveStatus,
  FacilityStatus,
} from '../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FACILITY_SERVICE_CONSTANT } from '../../common/constants/facility-service.constant';
import {
  BulkCreateFacilityServicesDto,
  CreateFacilityServiceDto,
} from './dto/requests/create-facility-service.dto';
import { SearchFacilityServiceDto } from './dto/requests/search-facility-service.dto';
import { PackageItem } from '../package-services/entities/package-item.entity';
import { PackageServiceFacility } from '../package-services/entities/package-service-facility.entity';
import { ServiceSaleMode } from '../services/dto/requests/create-service.dto';
import { FacilityService } from './entities/facility-service.entity';
import { FacilityServicesController } from './facility-services.controller';
import { FacilityServicesRepository } from './repositories/facility-services.repository';
import { FacilityServicesService } from './facility-services.service';
import { PublicFacilityServicesController } from './public-facility-services.controller';

describe('FacilityServices DTO validation', () => {
  const validPayload = {
    facilityId: '1',
    serviceId: '2',
    price: '280000.00',
    durationMinutes: '30',
    status: ActiveStatus.ACTIVE,
  };

  // Vai tro: dam bao DTO tao facility-service hop le va convert durationMinutes ve number.
  it('accepts a valid create payload and transforms duration', async () => {
    const dto = plainToInstance(CreateFacilityServiceDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.durationMinutes).toBe(30);
  });

  // Vai tro: dam bao payload gan hang loat service vao mot co so hop le va convert duration cua tung item.
  it('accepts a valid bulk create payload', async () => {
    const dto = plainToInstance(BulkCreateFacilityServicesDto, {
      facilityId: '1',
      services: [
        {
          serviceId: '2',
          price: '280000.00',
          durationMinutes: '30',
          status: ActiveStatus.ACTIVE,
        },
      ],
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.services[0].durationMinutes).toBe(30);
  });

  // Vai tro: gom cac input sai khi gan dich vu vao co so de bat loi id, gia, thoi luong va status.
  it.each([
    [{ ...validPayload, facilityId: '0' }, 'facilityId'],
    [{ ...validPayload, serviceId: '-1' }, 'serviceId'],
    [{ ...validPayload, price: '-1000' }, 'price'],
    [{ ...validPayload, durationMinutes: 3 }, 'durationMinutes'],
    [{ ...validPayload, status: 'available' }, 'status'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateFacilityServiceDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  // Vai tro: dam bao query search facility-service chan filter/phan trang khong hop le.
  it('validates search filters and pagination', async () => {
    const dto = plainToInstance(SearchFacilityServiceDto, {
      facilityId: '0',
      serviceTypeId: '0',
      status: 'available',
      page: '0',
      limit: '101',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['facilityId', 'serviceTypeId', 'status', 'page', 'limit']),
    );
  });
});

describe('FacilityServicesService business logic', () => {
  const facility = { id: '1', status: FacilityStatus.ACTIVE };
  const service = {
    id: '2',
    status: ActiveStatus.ACTIVE,
    serviceTypeId: '1',
    serviceType: { id: '1', code: 'ULTRASOUND', name: 'Siêu âm', status: ActiveStatus.ACTIVE },
    saleMode: ServiceSaleMode.BOTH,
    basePrice: '300000.00',
    defaultDurationMinutes: 30,
  };
  const entity = {
    id: '10',
    facilityId: '1',
    serviceId: '2',
    price: '280000.00',
    durationMinutes: 30,
    status: ActiveStatus.ACTIVE,
  };

  const createRepo = () => ({
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async data => ({ id: data.id ?? '10', ...data })),
    saveAndDetachFromPackages: jest.fn(async data => ({ id: data.id ?? '10', ...data })),
    saveMany: jest.fn(async (data: Array<Record<string, unknown>>) =>
      data.map((item, index) => ({ id: String(index + 20), ...item }))),
    remove: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue({ ...entity }),
    findByFacilityAndService: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([{ ...entity }]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [{ ...entity }], total: 1 }),
    findPublicByFacilityId: jest.fn().mockResolvedValue([{ ...entity, serviceName: 'Siêu âm thai 2D' }]),
    countDependencies: jest.fn().mockResolvedValue(0),
    findDetailsById: jest.fn().mockResolvedValue({ ...entity }),
  });
  const facilitiesService = { findById: jest.fn().mockResolvedValue(facility) };
  const servicesService = { findById: jest.fn().mockResolvedValue(service) };

  const createService = (repo = createRepo()) => ({
    repo,
    service: new FacilityServicesService(
      repo as never,
      facilitiesService as never,
      servicesService as never,
    ),
  });

  beforeEach(() => jest.clearAllMocks());

  // Vai tro: dam bao gan service vao facility chi duoc tao khi ca facility va service deu hop le.
  it('creates a facility service after validating facility and service', async () => {
    const { repo, service: facilityServicesService } = createService();
    await expect(facilityServicesService.create(entity as never)).resolves.toMatchObject({ id: '10' });
    expect(facilitiesService.findById).toHaveBeenCalledWith('1');
    expect(servicesService.findById).toHaveBeenCalledWith('2');
    expect(repo.findByFacilityAndService).toHaveBeenCalledWith('1', '2');
  });

  // Vai tro: khi co so dua service global vao goi, backend tu tao mapping facility-service neu chua co.
  it('ensures a global service is available for package usage without manual assignment', async () => {
    const { repo, service: facilityServicesService } = createService();

    await expect(facilityServicesService.ensureAvailableForPackage('1', '2')).resolves.toMatchObject({
      id: '10',
      facilityId: '1',
      serviceId: '2',
      price: '300000.00',
      durationMinutes: 30,
      status: ActiveStatus.ACTIVE,
    });

    expect(repo.findByFacilityAndService).toHaveBeenCalledWith('1', '2');
    expect(repo.create).toHaveBeenCalledWith({
      facilityId: '1',
      serviceId: '2',
      price: '300000.00',
      durationMinutes: 30,
      status: ActiveStatus.ACTIVE,
    });
    expect(repo.save).toHaveBeenCalled();
  });

  // Vai tro: gan hang loat service vao co so va tu lay gia/thoi luong mac dinh neu item khong gui.
  it('bulk creates facility services when all items are valid', async () => {
    const { repo, service: facilityServicesService } = createService();
    repo.saveMany = jest.fn(async (data: Array<Record<string, unknown>>) =>
      data.map((item, index) => ({ id: String(index + 20), ...item })));
    repo.findDetailsById = jest.fn(async id => ({ ...entity, id }));

    await expect(facilityServicesService.bulkCreate({
      facilityId: '1',
      services: [
        {
          serviceId: '2',
          status: ActiveStatus.ACTIVE,
        },
      ],
    })).resolves.toEqual([
      expect.objectContaining({ id: '20' }),
    ]);

    expect(repo.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({
        facilityId: '1',
        serviceId: '2',
        price: '300000.00',
        durationMinutes: 30,
      }),
    ]);
  });

  // Vai tro: neu bulk co item bi conflict thi tra danh sach loi theo tung dong, khong save nua.
  it('rejects bulk create with detailed item issues', async () => {
    const { repo, service: facilityServicesService } = createService();
    repo.saveMany = jest.fn();
    repo.findByFacilityAndService.mockImplementation(async (_facilityId, serviceId) =>
      serviceId === '2' ? entity : null,
    );
    servicesService.findById
      .mockResolvedValueOnce({ ...service, id: '2' })
      .mockResolvedValueOnce({ ...service, id: '3', status: ActiveStatus.INACTIVE });

    await expect(facilityServicesService.bulkCreate({
      facilityId: '1',
      services: [
        { serviceId: '2' },
        { serviceId: '3' },
        { serviceId: '2' },
      ],
    })).rejects.toMatchObject({
      response: {
        data: {
          facilityId: '1',
          invalidItems: 3,
          items: [
            expect.objectContaining({ index: 0, serviceId: '2' }),
            expect.objectContaining({ index: 1, serviceId: '3' }),
            expect.objectContaining({ index: 2, serviceId: '2' }),
          ],
        },
      },
    });
    expect(repo.saveMany).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra cac duong doc du lieu facility-service deu lay qua repository dung ham.
  it('returns list, paginated list, public list, and details through repository', async () => {
    const { repo, service: facilityServicesService } = createService();

    await expect(facilityServicesService.findAll({ facilityId: '1' })).resolves.toEqual([{ ...entity }]);
    await expect(facilityServicesService.findAllPaginated({ page: 1, limit: 20 })).resolves.toEqual({
      items: [{ ...entity }],
      total: 1,
    });
    await expect(facilityServicesService.findPublicByFacilityId('1', { status: ActiveStatus.ACTIVE })).resolves.toEqual([
      expect.objectContaining({ id: '10', serviceName: expect.any(String) }),
    ]);
    await expect(facilityServicesService.findDetailsById('10')).resolves.toEqual({ ...entity });
    expect(repo.findPublicByFacilityId).toHaveBeenCalledWith('1', { status: ActiveStatus.ACTIVE });
  });

  // Vai tro: dam bao API public khong hien dich vu cua facility da inactive.
  it('rejects public facility services when facility is inactive', async () => {
    facilitiesService.findById.mockResolvedValueOnce({ ...facility, status: FacilityStatus.INACTIVE });

    await expect(createService().service.findPublicByFacilityId('1')).rejects.toBeInstanceOf(ConflictException);
  });

  // Vai tro: bao ve rule khong trung cap facility-service va khong gan reference inactive.
  it('rejects duplicated mapping or inactive references', async () => {
    const duplicateContext = createService();
    duplicateContext.repo.findByFacilityAndService.mockResolvedValueOnce(entity);
    await expect(duplicateContext.service.create(entity as never)).rejects.toBeInstanceOf(ConflictException);

    facilitiesService.findById.mockResolvedValueOnce({ ...facility, status: FacilityStatus.INACTIVE });
    await expect(createService().service.create(entity as never)).rejects.toBeInstanceOf(ConflictException);

    servicesService.findById.mockResolvedValueOnce({ ...service, status: ActiveStatus.INACTIVE });
    await expect(createService().service.create(entity as never)).rejects.toBeInstanceOf(ConflictException);
  });

  // Vai tro: dam bao update mapping co save thanh cong va chi check duplicate khi cap facility/service thay doi.
  it('updates a facility service and checks duplicate pair when facility/service changes', async () => {
    const { repo, service: facilityServicesService } = createService();
    await expect(facilityServicesService.update('10', { price: '300000.00' })).resolves.toMatchObject({
      price: '300000.00',
    });
    expect(repo.save).toHaveBeenCalled();
  });

  // Vai tro: chan update lam trung cap facility-service voi mapping khac.
  it('rejects update when changed facility-service pair belongs to another mapping', async () => {
    const context = createService();
    context.repo.findByFacilityAndService.mockResolvedValueOnce({ ...entity, id: '99' });

    await expect(context.service.update('10', { serviceId: '3' })).rejects.toBeInstanceOf(ConflictException);
    expect(context.repo.save).not.toHaveBeenCalled();
  });

  // Vai tro: tranh query duplicate khong can thiet khi chi sua gia/trang thai cua mapping.
  it('does not check duplicate pair when update only changes price or status', async () => {
    const { repo, service: facilityServicesService } = createService();

    await expect(facilityServicesService.update('10', { price: '310000.00' })).resolves.toMatchObject({
      price: '310000.00',
    });
    expect(repo.findByFacilityAndService).not.toHaveBeenCalled();
  });

  it('detaches a facility service from packages when its status becomes inactive', async () => {
    const { repo, service: facilityServicesService } = createService();

    await expect(facilityServicesService.update('10', { status: ActiveStatus.INACTIVE }))
      .resolves.toMatchObject({ status: ActiveStatus.INACTIVE });

    expect(repo.saveAndDetachFromPackages).toHaveBeenCalledWith(
      expect.objectContaining({ id: '10', status: ActiveStatus.INACTIVE }),
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao mapping facility-service khong ton tai tra 404.
  it('throws not found when mapping does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: dam bao ban detail co join thong tin khong tim thay cung tra 404.
  it('throws not found when mapping details do not exist', async () => {
    const context = createService();
    context.repo.findDetailsById = jest.fn().mockResolvedValueOnce(null);

    await expect(context.service.findDetailsById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: kiem tra xoa cung mapping chua dung va chuyen unavailable khi da co lien ket.
  it('hard deletes unused mapping and marks used mapping unavailable', async () => {
    const hardContext = createService();
    await expect(hardContext.service.remove('10')).resolves.toEqual({
      action: 'hard_deleted',
      affectedCount: 0,
    });
    expect(hardContext.repo.remove).toHaveBeenCalled();

    const softContext = createService();
    softContext.repo.countDependencies.mockResolvedValueOnce(2);
    await expect(softContext.service.remove('10')).resolves.toEqual({
      action: 'soft_deleted',
      affectedCount: 2,
    });
    expect(softContext.repo.saveAndDetachFromPackages).toHaveBeenCalledWith(
      expect.objectContaining({ id: '10', status: ActiveStatus.INACTIVE }),
    );
  });
});

describe('FacilityServicesRepository remove rules', () => {
  const createQueryBuilderMock = (count = '0') => ({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ count }),
  });

  const createRepository = () => {
    const transactionManager = {
      find: jest.fn().mockResolvedValue([{ id: 'package-item-1' }]),
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(async (_target, value) => value),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      createQueryBuilder: jest.fn(),
      transaction: jest.fn(async (callback) => callback(transactionManager)),
    };
    const repository = {
      manager,
    };

    return {
      repository,
      transactionManager,
      facilityServicesRepository: new FacilityServicesRepository(repository as never),
    };
  };

  it('counts only generated facility-service history as delete dependency', async () => {
    const { repository, facilityServicesRepository } = createRepository();
    repository.manager.createQueryBuilder.mockImplementation(() => createQueryBuilderMock('1'));

    await expect(facilityServicesRepository.countDependencies('1', '2', '10')).resolves.toBe(2);
    expect(repository.manager.createQueryBuilder).toHaveBeenCalledTimes(2);
  });

  it('hard deletes package configuration before removing the facility-service mapping', async () => {
    const { repository, transactionManager, facilityServicesRepository } = createRepository();
    const entity = { id: '10', facilityId: '1', serviceId: '2' } as FacilityService;

    await facilityServicesRepository.remove(entity);

    expect(repository.manager.transaction).toHaveBeenCalled();
    expect(transactionManager.find).toHaveBeenCalledWith(PackageItem, {
      where: { facilityServiceId: '10' },
      select: { id: true },
    });
    expect(transactionManager.delete).toHaveBeenNthCalledWith(1, PackageServiceFacility, {
      packageItemId: expect.any(Object),
    });
    expect(transactionManager.delete).toHaveBeenNthCalledWith(2, PackageItem, {
      id: expect.any(Object),
    });
    expect(transactionManager.remove).toHaveBeenCalledWith(FacilityService, entity);
  });

  it('saves inactive status and removes package configuration atomically', async () => {
    const { repository, transactionManager, facilityServicesRepository } = createRepository();
    const entity = {
      id: '10', facilityId: '1', serviceId: '2', status: ActiveStatus.INACTIVE,
    } as FacilityService;

    await expect(facilityServicesRepository.saveAndDetachFromPackages(entity)).resolves.toBe(entity);

    expect(repository.manager.transaction).toHaveBeenCalled();
    expect(transactionManager.save).toHaveBeenCalledWith(FacilityService, entity);
    expect(transactionManager.delete).toHaveBeenNthCalledWith(1, PackageServiceFacility, {
      packageItemId: expect.any(Object),
    });
    expect(transactionManager.delete).toHaveBeenNthCalledWith(2, PackageItem, {
      id: expect.any(Object),
    });
  });
});

describe('FacilityServicesController', () => {
  const entity = {
    id: '10',
    facilityId: '1',
    serviceId: '2',
    price: '280000.00',
    durationMinutes: 30,
    status: ActiveStatus.ACTIVE,
  };

  const createServiceMock = () => ({
    create: jest.fn().mockResolvedValue(entity),
    bulkCreate: jest.fn().mockResolvedValue([entity]),
    findAll: jest.fn().mockResolvedValue([entity]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [entity], total: 1, page: 1, limit: 20 }),
    findDetailsById: jest.fn().mockResolvedValue({ ...entity, serviceName: 'Sieu am' }),
    update: jest.fn().mockResolvedValue({ ...entity, price: '300000.00' }),
    remove: jest.fn().mockResolvedValue({ action: 'soft_deleted', affectedCount: 1 }),
    findPublicByFacilityId: jest.fn().mockResolvedValue([entity]),
  });

  // Vai tro: dam bao controller quan tri chon list thuong/phan trang va boc response dung chuan.
  it('chooses list method by query.page and wraps management response', async () => {
    const service = createServiceMock();
    const controller = new FacilityServicesController(service as never);

    await expect(controller.findAll({ page: 1 } as never)).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.FOUND,
      data: { total: 1 },
    });
    await expect(controller.findAll({} as never)).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.FOUND,
      data: [entity],
    });
  });

  // Vai tro: kiem tra detail/update/remove facility-service; route create le da bo de ep workflow tao service kem assign.
  it('wraps detail, update, and remove responses', async () => {
    const service = createServiceMock();
    const controller = new FacilityServicesController(service as never);

    await expect(controller.findOne('10')).resolves.toMatchObject({ message: FACILITY_SERVICE_CONSTANT.DETAIL_FOUND });
    await expect(controller.create(entity as never)).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.CREATED,
      data: { id: '10' },
    });
    await expect(controller.bulkCreate({ facilityId: '1', services: [{ serviceId: '2' }] } as never)).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.BULK_CREATED,
      data: [entity],
    });
    await expect(controller.update('10', { price: '300000.00' })).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.UPDATED,
      data: { price: '300000.00' },
    });
    await expect(controller.remove('10')).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.DELETED,
      data: { action: 'soft_deleted' },
    });
  });

  // Vai tro: dam bao API public lay dich vu theo facility tra response dung format va truyen filter xuong service.
  it('wraps public facility service response', async () => {
    const service = createServiceMock();
    const controller = new PublicFacilityServicesController(service as never);

    await expect(controller.findServicesByFacility('1', { serviceTypeId: '1' } as never)).resolves.toEqual({
      message: RESPONSE_MESSAGES.SUCCESS,
      data: [entity],
    });
    expect(service.findPublicByFacilityId).toHaveBeenCalledWith('1', { serviceTypeId: '1' });
  });
});
