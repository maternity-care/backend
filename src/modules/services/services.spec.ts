import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActiveStatus } from '../../common/constants/status.enum';
import { CreateServiceDto, ServiceType } from './dto/requests/create-service.dto';
import { SearchServiceDto } from './dto/requests/search-service.dto';
import { ServicesService } from './services.service';

describe('Services DTO validation', () => {
  const validPayload = {
    code: 'US_2D',
    name: 'Siêu âm thai 2D',
    description: 'Dịch vụ siêu âm thai cơ bản',
    serviceType: ServiceType.ULTRASOUND,
    defaultDurationMinutes: '30',
    basePrice: '300000.00',
    requiresDoctorWarning: 'true',
    status: ActiveStatus.ACTIVE,
  };

  it('accepts a valid create payload and transforms primitive values', async () => {
    const dto = plainToInstance(CreateServiceDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.code).toBe('US_2D');
    expect(dto.defaultDurationMinutes).toBe(30);
    expect(dto.requiresDoctorWarning).toBe(true);
  });

  it.each([
    [{ ...validPayload, code: 'bad code' }, 'code'],
    [{ ...validPayload, name: 'A' }, 'name'],
    [{ ...validPayload, serviceType: 'invalid' }, 'serviceType'],
    [{ ...validPayload, defaultDurationMinutes: 3 }, 'defaultDurationMinutes'],
    [{ ...validPayload, basePrice: '-1' }, 'basePrice'],
    [{ ...validPayload, status: 'deleted' }, 'status'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateServiceDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  it('validates search pagination and enum filters', async () => {
    const dto = plainToInstance(SearchServiceDto, {
      serviceType: 'invalid',
      status: 'deleted',
      page: '0',
      limit: '101',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['serviceType', 'status', 'page', 'limit']),
    );
  });
});

describe('ServicesService business logic', () => {
  const serviceEntity = {
    id: '1',
    code: 'US_2D',
    name: 'Siêu âm thai 2D',
    serviceType: ServiceType.ULTRASOUND,
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
    findByName: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([{ ...serviceEntity }]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [{ ...serviceEntity }], total: 1 }),
    countDependencies: jest.fn().mockResolvedValue(0),
    updateStatus: jest.fn(async (entity, status) => ({ ...entity, status })),
  });

  const createService = (repo = createRepo()) => ({
    repo,
    service: new ServicesService(repo as never),
  });

  it('creates a service after checking unique code and name', async () => {
    const { repo, service } = createService();
    await expect(service.create({
      code: 'US_2D',
      name: 'Siêu âm thai 2D',
      serviceType: ServiceType.ULTRASOUND,
      defaultDurationMinutes: 30,
      basePrice: '300000.00',
      requiresDoctorWarning: true,
      status: ActiveStatus.ACTIVE,
    })).resolves.toMatchObject({ id: '1', requiresDoctorWarning: 1 });
    expect(repo.findByCode).toHaveBeenCalledWith('US_2D');
    expect(repo.findByName).toHaveBeenCalledWith('Siêu âm thai 2D');
  });

  it('rejects duplicated code or name', async () => {
    const codeContext = createService();
    codeContext.repo.findByCode.mockResolvedValueOnce(serviceEntity);
    await expect(codeContext.service.create(serviceEntity as never)).rejects.toBeInstanceOf(ConflictException);

    const nameContext = createService();
    nameContext.repo.findByName.mockResolvedValueOnce(serviceEntity);
    await expect(nameContext.service.create(serviceEntity as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a service and converts boolean warning flag to number', async () => {
    const { repo, service } = createService();
    await expect(service.update('1', { requiresDoctorWarning: false })).resolves.toMatchObject({
      requiresDoctorWarning: 0,
    });
    expect(repo.save).toHaveBeenCalled();
  });

  it('throws not found when service does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

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
