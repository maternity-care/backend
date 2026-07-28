import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActiveStatus } from '../../common/constants/status.enum';
import { SERVICE_CONSTANT } from '../../common/constants/service.constant';
import { CreateServiceDto } from './dto/requests/create-service.dto';
import { SearchServiceDto } from './dto/requests/search-service.dto';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

describe('Services DTO validation', () => {
  const validPayload = {
    name: 'Siêu âm thai 2D',
    description: 'Dịch vụ siêu âm thai cơ bản',
    serviceTypeId: '1',
    defaultDurationMinutes: '30',
    basePrice: '300000.00',
    requiresDoctorWarning: 'true',
    status: ActiveStatus.ACTIVE,
    facilityAssignments: [
      {
        facilityId: '1',
        price: '280000.00',
        durationMinutes: '30',
        status: ActiveStatus.ACTIVE,
      },
    ],
  };

  // Vai tro: dam bao DTO tao service hop le va bien doi cac field string sang kieu boolean/number dung.
  it('accepts a valid create payload and transforms primitive values', async () => {
    const dto = plainToInstance(CreateServiceDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.defaultDurationMinutes).toBe(30);
    expect(dto.requiresDoctorWarning).toBe(true);
  });

  // Vai tro: dam bao payload tao service co the kem danh sach co so can assign ngay, moi co so co gia/thoi luong rieng.
  it('accepts facility assignments when creating a service', async () => {
    const dto = plainToInstance(CreateServiceDto, {
      ...validPayload,
      facilityAssignments: [
        {
          facilityId: '1',
          price: '280000.00',
          durationMinutes: '30',
          status: ActiveStatus.ACTIVE,
        },
      ],
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.facilityAssignments?.[0].durationMinutes).toBe(30);
  });

  // Vai tro: gom cac input tao service sai de DTO bat loi ma, ten, loai dich vu, thoi luong, gia va status.
  it.each([
    [{ ...validPayload, name: 'A' }, 'name'],
    [{ ...validPayload, serviceTypeId: '0' }, 'serviceTypeId'],
    [{ ...validPayload, defaultDurationMinutes: 3 }, 'defaultDurationMinutes'],
    [{ ...validPayload, basePrice: '-1' }, 'basePrice'],
    [{ ...validPayload, status: 'deleted' }, 'status'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateServiceDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  // Vai tro: dam bao query search service chan enum sai va tham so phan trang ngoai gioi han.
  it('validates search pagination and enum filters', async () => {
    const dto = plainToInstance(SearchServiceDto, {
      serviceTypeId: '0',
      status: 'deleted',
      page: '0',
      limit: '101',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['serviceTypeId', 'status', 'page', 'limit']),
    );
  });
});

describe('ServicesService business logic', () => {
  const serviceEntity = {
    id: '1',
    code: 'US_2D',
    name: 'Siêu âm thai 2D',
    serviceTypeId: '1',
    serviceType: { id: '1', code: 'ULTRASOUND', name: 'Siêu âm', status: ActiveStatus.ACTIVE },
    defaultDurationMinutes: 30,
    basePrice: '300000.00',
    requiresDoctorWarning: 1,
    status: ActiveStatus.ACTIVE,
  };

  const createRepo = () => ({
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async data => ({ id: data.id ?? '1', ...data })),
    remove: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue({ ...serviceEntity }),
    findByCode: jest.fn().mockResolvedValue(null),
    findCodesByPrefix: jest.fn().mockResolvedValue([]),
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([{ ...serviceEntity }]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [{ ...serviceEntity }], total: 1 }),
    countDependencies: jest.fn().mockResolvedValue(0),
    updateStatus: jest.fn(async (entity, status) => ({ ...entity, status })),
  });

  const serviceTypesService = {
    findActiveById: jest.fn().mockResolvedValue({
      id: '1',
      code: 'ULTRASOUND',
      name: 'Siêu âm',
      status: ActiveStatus.ACTIVE,
    }),
  };

  const createService = (repo = createRepo()) => ({
    repo,
    service: new ServicesService(repo as never, serviceTypesService as never),
  });

  beforeEach(() => jest.clearAllMocks());

  // Vai tro: dam bao tao dich vu goc phai check trung code va name truoc khi save.
  it('creates a base service without facility assignments', async () => {
    const { repo, service } = createService();
    await expect(service.create({
      name: 'Siêu âm thai 2D',
      serviceTypeId: '1',
      defaultDurationMinutes: 30,
      basePrice: '300000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    })).resolves.toMatchObject({
      id: '1',
      facilityAssignments: undefined,
      saleMode: 'both',
    });
    expect(repo.findCodesByPrefix).toHaveBeenCalled();
    expect(repo.findByName).toHaveBeenCalledWith('Siêu âm thai 2D');
    expect(serviceTypesService.findActiveById).toHaveBeenCalledWith('1');
    expect(repo.save).toHaveBeenCalled();
  });

  // Vai tro: tao service goc va gan luon vao facility_services trong cung transaction khi client gui facilityAssignments.
  it('creates a service with facility assignments', async () => {
    const { repo } = createService();
    const manager = {
      create: jest.fn((_entity, data) => ({ ...data })),
      save: jest.fn(async (_entity, data) => {
        if (Array.isArray(data)) {
          return data.map((item, index) => ({ id: String(index + 10), ...item }));
        }
        return { id: '1', ...data };
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const facilitiesService = {
      findById: jest.fn().mockResolvedValue({ id: '1', status: ActiveStatus.ACTIVE }),
    };
    const service = new ServicesService(
      repo as never,
      serviceTypesService as never,
      dataSource as never,
      facilitiesService as never,
    );

    await expect(service.create({
      name: 'Siêu âm thai 2D',
      serviceTypeId: '1',
      defaultDurationMinutes: 30,
      basePrice: '300000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
      facilityAssignments: [{ facilityId: '1', status: ActiveStatus.ACTIVE }],
    })).resolves.toMatchObject({
      id: '1',
      facilityServices: [
        expect.objectContaining({
          facilityId: '1',
          serviceId: '1',
          price: '300000.00',
          durationMinutes: 30,
        }),
      ],
    });

    expect(facilitiesService.findById).toHaveBeenCalledWith('1');
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  // Vai tro: bao ve rule khong cho 2 dich vu goc trung name.
  it('rejects duplicated name', async () => {
    const nameContext = createService();
    nameContext.repo.findByName.mockResolvedValueOnce(serviceEntity);
    await expect(nameContext.service.create(serviceEntity as never)).rejects.toBeInstanceOf(ConflictException);
  });

  // Vai tro: dam bao code duoc BE tu sinh va tu tang hau to khi prefix da ton tai.
  it('auto-generates the next service code from name', async () => {
    const { repo, service } = createService();
    repo.findCodesByPrefix.mockResolvedValueOnce(['SIEU_AM_THAI_2D', 'SIEU_AM_THAI_2D_02']);

    await expect(service.create({
      name: 'Sieu am thai 2D',
      serviceTypeId: '1',
      defaultDurationMinutes: 30,
      basePrice: '300000.00',
      status: ActiveStatus.ACTIVE,
    })).resolves.toMatchObject({
      code: 'SIEU_AM_THAI_2D_03',
    });
  });

  // Vai tro: dam bao update service convert flag requiresDoctorWarning ve dang DB dang dung la 0/1.
  it('updates a service and converts boolean warning flag to number', async () => {
    const { repo, service } = createService();
    await expect(service.update('1', { requiresDoctorWarning: false })).resolves.toMatchObject({
      requiresDoctorWarning: 0,
    });
    expect(repo.save).toHaveBeenCalled();
  });

  // Vai tro: kiem tra service tra dung danh sach thuong va danh sach phan trang tu repository.
  it('returns plain and paginated service lists through repository', async () => {
    const { repo, service } = createService();
    await expect(service.findAll({ serviceTypeId: '1' })).resolves.toEqual([{ ...serviceEntity }]);
    await expect(service.findAllPaginated({ page: 1, limit: 20 })).resolves.toEqual({
      items: [{ ...serviceEntity }],
      total: 1,
    });
    expect(repo.findAll).toHaveBeenCalledWith({ serviceTypeId: '1' });
    expect(repo.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  // Vai tro: dam bao update name moi se check duplicate truoc khi save.
  it('checks duplicated name when update changes that field', async () => {
    const duplicateNameContext = createService();
    duplicateNameContext.repo.findByName.mockResolvedValueOnce(serviceEntity);
    await expect(duplicateNameContext.service.update('1', { name: 'Sieu am thai 3D' })).rejects.toBeInstanceOf(ConflictException);
    expect(duplicateNameContext.repo.save).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao update mot phan khong lam mat description/flag cu khi client khong gui len.
  it('preserves description and warning flag when update omits them', async () => {
    const { repo, service } = createService();
    repo.findById.mockResolvedValueOnce({ ...serviceEntity, description: 'old description', requiresDoctorWarning: 1 });

    await expect(service.update('1', { basePrice: '350000.00' })).resolves.toMatchObject({
      description: 'old description',
      requiresDoctorWarning: 1,
      basePrice: '350000.00',
    });
  });

  // Vai tro: dam bao serviceId khong ton tai tra NotFoundException ro rang.
  it('throws not found when service does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: kiem tra rule xoa cung dich vu chua dung va xoa mem/inactive dich vu da co lien ket.
  it('hard deletes an unused service and soft deletes a used service', async () => {
    const hardContext = createService();
    await expect(hardContext.service.remove('1')).resolves.toEqual({
      action: 'hard_deleted',
      affectedCount: 0,
    });
    expect(hardContext.repo.remove).toHaveBeenCalled();

    const softContext = createService();
    softContext.repo.countDependencies.mockResolvedValueOnce(3);
    await expect(softContext.service.remove('1')).resolves.toEqual({
      action: 'soft_deleted',
      affectedCount: 3,
    });
    expect(softContext.repo.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
      ActiveStatus.INACTIVE,
    );
  });
});

describe('ServicesController', () => {
  const serviceEntity = {
    id: '1',
    code: 'US_2D',
    name: 'Sieu am thai 2D',
    serviceTypeId: '1',
    serviceType: { id: '1', code: 'ULTRASOUND', name: 'Siêu âm', status: ActiveStatus.ACTIVE },
    defaultDurationMinutes: 30,
    basePrice: '300000.00',
    requiresDoctorWarning: 1,
    status: ActiveStatus.ACTIVE,
  };

  const createServiceMock = () => ({
    create: jest.fn().mockResolvedValue(serviceEntity),
    findAll: jest.fn().mockResolvedValue([serviceEntity]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [serviceEntity], total: 1, page: 1, limit: 20 }),
    findById: jest.fn().mockResolvedValue(serviceEntity),
    update: jest.fn().mockResolvedValue({ ...serviceEntity, basePrice: '350000.00' }),
    remove: jest.fn().mockResolvedValue({ action: 'hard_deleted', affectedCount: 0 }),
  });

  // Vai tro: dam bao controller chon list phan trang khi co page va boc response dung format.
  it('chooses list method by query.page and wraps response', async () => {
    const service = createServiceMock();
    const controller = new ServicesController(service as never);

    await expect(controller.findAll({ page: 1 } as never)).resolves.toMatchObject({
      message: SERVICE_CONSTANT.FOUND,
      data: { total: 1 },
    });
    await expect(controller.findAll({} as never)).resolves.toMatchObject({
      message: SERVICE_CONSTANT.FOUND,
      data: [serviceEntity],
    });
    expect(service.findAllPaginated).toHaveBeenCalledWith({ page: 1 });
    expect(service.findAll).toHaveBeenCalledWith({});
  });

  // Vai tro: kiem tra cac API service CRUD tra message/data wrapper nhat quan cho FE.
  it('wraps detail, create, update, and remove responses', async () => {
    const service = createServiceMock();
    const controller = new ServicesController(service as never);

    await expect(controller.findOne('1')).resolves.toMatchObject({ message: SERVICE_CONSTANT.DETAIL_FOUND, data: serviceEntity });
    await expect(controller.create(serviceEntity as never)).resolves.toMatchObject({ message: SERVICE_CONSTANT.CREATED, data: serviceEntity });
    await expect(controller.update('1', { basePrice: '350000.00' })).resolves.toMatchObject({
      message: SERVICE_CONSTANT.UPDATED,
      data: { basePrice: '350000.00' },
    });
    await expect(controller.remove('1')).resolves.toMatchObject({
      message: SERVICE_CONSTANT.DELETED,
      data: { action: 'hard_deleted' },
    });
  });
});
