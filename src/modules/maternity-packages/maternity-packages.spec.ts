import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MaternityPackageStatus } from '../../common/constants/status.enum';
import { CreateMaternityPackageDto } from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { MaternityPackagesService } from './maternity-packages.service';

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
    countDependencies: jest.fn().mockResolvedValue(0),
    updateStatus: jest.fn(async (entity, status) => ({ ...entity, status })),
  });

  const createService = (repo = createRepo()) => ({
    repo,
    service: new MaternityPackagesService(repo as never),
  });

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

  it('throws not found when package does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
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
