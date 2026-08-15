import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MATERNITY_PACKAGE_CONSTANT } from '../../common/constants/maternity-package.constant';
import { MaternityPackageStatus } from '../../common/constants/status.enum';
import {
  CreateMaternityPackageDto,
  CreateQuantityMaternityPackageDto,
  CreateScheduleMaternityPackageDto,
  MaternityPackageStageType,
  MaternityPackageType,
} from './dto/requests/create-maternity-package.dto';
import { SearchMaternityPackageDto } from './dto/requests/search-maternity-package.dto';
import { MaternityPackage } from './entities/maternity-package.entity';
import { PackageStage } from './entities/package-stage.entity';
import { MaternityPackagesController } from './maternity-packages.controller';
import { MaternityPackagesService } from './maternity-packages.service';
import { PublicFacilityMaternityPackagesController } from './public-facility-maternity-packages.controller';
import { PublicMaternityPackagesController } from './public-maternity-packages.controller';
import { PackageItem } from '../package-services/entities/package-item.entity';
import { MaternityPackagesRepository } from './repositories/maternity-packages.repository';

describe('MaternityPackages DTO validation', () => {
  const validPayload = {
    facilityId: '1',
    name: 'Gói thai sản cơ bản',
    description: 'Gói theo dõi thai kỳ cơ bản',
    price: '900000.00',
    durationDays: '90',
    priorityLevel: '1',
    status: MaternityPackageStatus.DRAFT,
    services: [
      {
        facilityServiceId: '10',
        includedQuantity: '2',
        isRequired: 'true',
        isOptional: 'false',
        sortOrder: '1',
      },
    ],
  };

  // Vai tro: dam bao DTO tao package hop le va convert durationDays/priorityLevel ve number.
  it('accepts a valid create payload and transforms numeric fields', async () => {
    const dto = plainToInstance(CreateMaternityPackageDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.durationDays).toBe(90);
    expect(dto.priorityLevel).toBe(1);
  });

  // Vai tro: dam bao API tao goi theo so luot chi can services[] va khong bat FE gui packageType.
  it('accepts quantity create payload without packageType', async () => {
    const dto = plainToInstance(CreateQuantityMaternityPackageDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
  });

  // Vai tro: dam bao API tao goi theo lich trinh chi can stages[] va khong bat FE gui services[] o root.
  it('accepts schedule create payload without packageType', async () => {
    const dto = plainToInstance(CreateScheduleMaternityPackageDto, {
      ...validPayload,
      services: undefined,
      stages: [
        {
          name: 'Tuan 12 - 14',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 12,
          weekTo: 14,
          services: validPayload.services,
        },
      ],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  // Vai tro: gom cac input tao package sai de DTO bat loi code, name, price, duration, priority va status.
  it.each([
    [{ ...validPayload, name: 'A' }, 'name'],
    [{ ...validPayload, price: '-1' }, 'price'],
    [{ ...validPayload, durationDays: 0 }, 'durationDays'],
    [{ ...validPayload, priorityLevel: 101 }, 'priorityLevel'],
    [{ ...validPayload, status: 'deleted' }, 'status'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateMaternityPackageDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  // Vai tro: dam bao query search package chan status sai va phan trang ngoai gioi han.
  it('validates search filters and pagination', async () => {
    const dto = plainToInstance(SearchMaternityPackageDto, {
      status: 'deleted',
      page: '0',
      limit: '201',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['status', 'page', 'limit']),
    );
  });
});

describe('MaternityPackagesService business logic', () => {
  const packageEntity = {
    id: '1',
    facilityId: '1',
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
    findByFacilityAndCode: jest.fn().mockResolvedValue(null),
    findCodesByFacilityAndPrefix: jest.fn().mockResolvedValue([]),
    findByFacilityAndName: jest.fn().mockResolvedValue(null),
    saveWithItems: jest.fn(async (entity, items = []) => ({ id: entity.id ?? '1', ...entity, services: items })),
    saveWithStagesAndItems: jest.fn(async (entity, stages = []) => ({ id: entity.id ?? '1', ...entity, stages })),
    replaceItems: jest.fn().mockResolvedValue(undefined),
    replaceStagesAndItems: jest.fn().mockResolvedValue(undefined),
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
  const facilityServicesService = {
    ensureAvailableForPackage: jest.fn().mockResolvedValue({
      id: '10',
      facilityId: '1',
      serviceId: '5',
      status: 'active',
    }),
    findDetailsById: jest.fn().mockResolvedValue({
      id: '10',
      facilityId: '1',
      serviceId: '5',
      status: 'active',
      service: { id: '5', status: 'active' },
    }),
  };

  const createService = (repo = createRepo()) => ({
    repo,
    service: new MaternityPackagesService(repo as never, facilitiesService as never, facilityServicesService as never),
  });

  beforeEach(() => jest.clearAllMocks());

  // Vai tro: tao goi thai san phai check unique name va tu sinh code truoc khi save.
  it('creates a package after checking unique name and generating code', async () => {
    const { repo, service } = createService();
    await expect(service.create({
      facilityId: '1',
      name: 'Gói thai sản cơ bản',
      description: 'Gói theo dõi thai kỳ cơ bản',
      price: '900000.00',
      durationDays: 90,
      priorityLevel: 1,
      status: MaternityPackageStatus.DRAFT,
      services: [
        {
          facilityServiceId: '10',
          includedQuantity: 2,
          isRequired: true,
          isOptional: false,
          sortOrder: 1,
        },
      ],
    })).resolves.toMatchObject({ id: '1', code: expect.any(String) });
    expect(repo.findCodesByFacilityAndPrefix).toHaveBeenCalled();
    expect(repo.findByFacilityAndName).toHaveBeenCalledWith('1', 'Gói thai sản cơ bản');
  });

  // Vai tro: backend van bao ve phan loai dich vu neu client khong dung modal cua he thong.
  it('rejects a package service with contradictory classification flags', async () => {
    const { repo, service } = createService();

    await expect(service.create({
      facilityId: '1',
      name: 'Gói kiểm tra phân loại',
      price: '900000.00',
      status: MaternityPackageStatus.DRAFT,
      services: [{
        facilityServiceId: '10',
        includedQuantity: 1,
        isRequired: false,
        isOptional: false,
      }],
    })).rejects.toThrow(MATERNITY_PACKAGE_CONSTANT.SERVICE_CLASSIFICATION_INVALID);
    expect(repo.saveWithItems).not.toHaveBeenCalled();
  });

  // Vai tro: tao goi va gan luon danh sach dich vu trong mot API; moi facilityService phai thuoc dung facility cua goi.
  it('creates a package with package services in one request', async () => {
    const { repo, service } = createService();

    await expect(service.create({
      facilityId: '1',
      name: 'Gói thai sản cơ bản',
      price: '900000.00',
      status: MaternityPackageStatus.DRAFT,
      services: [
        {
          facilityServiceId: '10',
          includedQuantity: 2,
          isRequired: true,
          isOptional: false,
          sortOrder: 1,
        },
      ],
    })).resolves.toMatchObject({
      id: '1',
      services: [
        expect.objectContaining({
          facilityServiceId: '10',
          includedQuantity: 2,
        }),
      ],
    });

    expect(facilityServicesService.findDetailsById).toHaveBeenCalledWith('10');
    expect(repo.saveWithItems).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: '1' }),
      [
        expect.objectContaining({
          facilityServiceId: '10',
          includedQuantity: 2,
          allowedFacilityScope: 'all',
        }),
      ],
    );
  });

  // Vai tro: facility co the chon service goc trong catalog, backend tu tao/tim facility-service de dua vao goi.
  it('creates package items from global service ids without manual facility assignment', async () => {
    const { repo, service } = createService();

    await expect(service.createQuantity({
      facilityId: '1',
      name: 'Goi thai san theo so luot',
      price: '900000.00',
      status: MaternityPackageStatus.DRAFT,
      services: [
        {
          serviceId: '5',
          includedQuantity: 2,
          isRequired: true,
          isOptional: false,
        },
      ],
    })).resolves.toMatchObject({
      id: '1',
      services: [
        expect.objectContaining({
          facilityServiceId: '10',
          includedQuantity: 2,
        }),
      ],
    });

    expect(facilityServicesService.ensureAvailableForPackage).toHaveBeenCalledWith('1', '5');
    expect(repo.saveWithItems).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: '1' }),
      [
        expect.objectContaining({
          facilityServiceId: '10',
          includedQuantity: 2,
        }),
      ],
    );
  });

  // Vai tro: tao goi lich trinh gom cac moc tuan thai; moi dich vu trong moc van phai la facilityService cua cung co so.
  it('creates a schedule package with stages and services in one request', async () => {
    const { repo, service } = createService();

    await expect(service.create({
      facilityId: '1',
      name: 'Gói thai sản theo lịch trình',
      price: '3970000.00',
      status: MaternityPackageStatus.DRAFT,
      packageType: MaternityPackageType.SCHEDULE,
      stages: [
        {
          name: 'Tuần 12 - 14',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 12,
          weekTo: 14,
          goal: 'Siêu âm hình thái, khảo sát dị tật thai',
          services: [
            {
              facilityServiceId: '10',
              includedQuantity: 1,
              isRequired: true,
              isOptional: false,
            },
          ],
        },
      ],
    })).resolves.toMatchObject({
      id: '1',
      packageType: MaternityPackageType.SCHEDULE,
      stages: [
        expect.objectContaining({
          stage: expect.objectContaining({
            name: 'Tuần 12 - 14',
            weekFrom: 12,
            weekTo: 14,
          }),
        }),
      ],
    });

    expect(repo.saveWithStagesAndItems).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: '1', packageType: MaternityPackageType.SCHEDULE }),
      [
        expect.objectContaining({
          stage: expect.objectContaining({ name: 'Tuần 12 - 14' }),
          items: [
            expect.objectContaining({
              facilityServiceId: '10',
              includedQuantity: 1,
            }),
          ],
        }),
      ],
    );
  });

  // Vai tro: tranh nhap nham service phang o root khi tao goi theo lich trinh, vi service phai nam trong tung stage.
  it('rejects schedule package when root services are sent instead of stage services', async () => {
    const { service } = createService();

    await expect(service.create({
      facilityId: '1',
      name: 'Gói thai sản theo lịch trình',
      price: '3970000.00',
      status: MaternityPackageStatus.DRAFT,
      packageType: MaternityPackageType.SCHEDULE,
      services: [
        {
          facilityServiceId: '10',
          includedQuantity: 1,
          isRequired: true,
          isOptional: false,
        },
      ],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  // Vai tro: tranh nhap nham stages khi tao goi theo so luot, vi goi quantity chi dung services[] o root.
  it('rejects quantity package when stages are sent instead of root services', async () => {
    const { service } = createService();

    await expect(service.create({
      facilityId: '1',
      name: 'Goi thai san theo so luot',
      price: '900000.00',
      status: MaternityPackageStatus.DRAFT,
      packageType: MaternityPackageType.QUANTITY,
      stages: [
        {
          name: 'Tuan 12 - 14',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 12,
          weekTo: 14,
          services: [
            {
              facilityServiceId: '10',
              includedQuantity: 1,
              isRequired: true,
              isOptional: false,
            },
          ],
        },
      ],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  // Vai tro: goi thai san cua mot co so chi duoc chon facilityServiceId da duoc assign vao co so do.
  it('rejects package service when the service has not been assigned to the facility', async () => {
    facilityServicesService.findDetailsById.mockRejectedValueOnce(new NotFoundException('Facility service not found'));
    const { service } = createService();

    await expect(service.createQuantity({
      facilityId: '1',
      name: 'Goi thai san theo so luot',
      price: '900000.00',
      status: MaternityPackageStatus.DRAFT,
      services: [
        {
          facilityServiceId: '999',
          includedQuantity: 1,
          isRequired: true,
          isOptional: false,
        },
      ],
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: dam bao hai API create rieng tu gan dung packageType truoc khi save.
  it('creates quantity and schedule packages through dedicated methods', async () => {
    const quantityContext = createService();
    await quantityContext.service.createQuantity({
      facilityId: '1',
      name: 'Goi thai san theo so luot',
      price: '900000.00',
      status: MaternityPackageStatus.DRAFT,
      services: [
        {
          facilityServiceId: '10',
          includedQuantity: 2,
          isRequired: true,
          isOptional: false,
        },
      ],
    });
    expect(quantityContext.repo.saveWithItems).toHaveBeenCalledWith(
      expect.objectContaining({ packageType: MaternityPackageType.QUANTITY }),
      expect.any(Array),
    );

    const scheduleContext = createService();
    await scheduleContext.service.createSchedule({
      facilityId: '1',
      name: 'Goi thai san theo lich trinh',
      price: '3970000.00',
      status: MaternityPackageStatus.DRAFT,
      stages: [
        {
          name: 'Tuan 12 - 14',
          stageType: MaternityPackageStageType.PREGNANCY_WEEK,
          weekFrom: 12,
          weekTo: 14,
          services: [
            {
              facilityServiceId: '10',
              includedQuantity: 1,
              isRequired: true,
              isOptional: false,
            },
          ],
        },
      ],
    });
    expect(scheduleContext.repo.saveWithStagesAndItems).toHaveBeenCalledWith(
      expect.objectContaining({ packageType: MaternityPackageType.SCHEDULE }),
      expect.any(Array),
    );
  });

  // Vai tro: bao ve rule khong cho hai goi thai san trung name trong cung co so.
  it('rejects duplicated name', async () => {
    const nameContext = createService();
    nameContext.repo.findByFacilityAndName.mockResolvedValueOnce(packageEntity);
    await expect(nameContext.service.create(packageEntity as never)).rejects.toBeInstanceOf(ConflictException);
  });

  // Vai tro: dam bao code goi thai san duoc BE tu sinh theo name va tang hau to khi trung trong cung co so.
  it('auto-generates the next maternity package code by facility and name', async () => {
    const { repo, service } = createService();
    repo.findCodesByFacilityAndPrefix.mockResolvedValueOnce(['GOI_THAI_SAN_CO_BAN', 'GOI_THAI_SAN_CO_BAN_02']);

    await expect(service.createQuantity({
      facilityId: '1',
      name: 'Goi thai san co ban',
      price: '900000.00',
      status: MaternityPackageStatus.DRAFT,
      services: [
        {
          facilityServiceId: '10',
          includedQuantity: 1,
          isRequired: true,
          isOptional: false,
        },
      ],
    })).resolves.toMatchObject({
      code: 'GOI_THAI_SAN_CO_BAN_03',
    });
  });

  // Vai tro: dam bao update package binh thuong save duoc va duplicate chi can check khi doi code/name.
  it('updates a package and checks duplicate fields only when changed', async () => {
    const { repo, service } = createService();
    await expect(service.update('1', { price: '850000.00' })).resolves.toMatchObject({
      price: '850000.00',
    });
    expect(repo.save).toHaveBeenCalled();
  });

  // Vai tro: dam bao list package co data tra ve dung ca dang thuong va dang phan trang.
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

  // Vai tro: chan update package thanh name da thuoc ve package khac.
  it('rejects update when changed name already exists', async () => {
    const nameContext = createService();
    nameContext.repo.findByFacilityAndName.mockResolvedValueOnce({ ...packageEntity, id: '2' });
    await expect(nameContext.service.update('1', { name: 'Goi thai san nang cao' })).rejects.toBeInstanceOf(ConflictException);
    expect(nameContext.repo.save).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao update mot phan khong xoa mat description cu neu client khong gui.
  it('preserves existing description when update omits description', async () => {
    const { service } = createService();

    await expect(service.update('1', { price: '850000.00' })).resolves.toMatchObject({
      description: packageEntity.description,
      price: '850000.00',
    });
  });

  // Vai tro: dam bao packageId khong ton tai tra 404.
  it('throws not found when package does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: danh sach rong la ket qua hop le de FE hien empty state, khong phai loi 404.
  it('returns empty package lists without throwing not found', async () => {
    const listContext = createService();
    listContext.repo.findAll.mockResolvedValueOnce([]);
    await expect(listContext.service.findAll({ status: MaternityPackageStatus.ACTIVE })).resolves.toEqual([]);

    const pagedContext = createService();
    pagedContext.repo.findAllPaginated.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    await expect(pagedContext.service.findAllPaginated({ page: 1, limit: 20 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  // Vai tro: kiem tra API kha dung theo facility tra goi co day du service va ho tro phan trang.
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

  // Vai tro: dam bao facility khong co package kha dung se tra 404 ro rang cho FE.
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

  // Vai tro: dam bao facility inactive bi chan truoc khi query package kha dung.
  it('throws not found when facility is inactive before checking available packages', async () => {
    facilitiesService.findById.mockResolvedValueOnce({ id: '1', status: 'inactive' });
    const { repo, service } = createService();

    await expect(service.findAvailableByFacilityId('1')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findAvailableByFacilityId).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra xoa cung package chua dung va chuyen inactive khi package da co lien ket.
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

describe('MaternityPackagesRepository remove rules', () => {
  const createQueryBuilderMock = (count = '0') => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count }),
    };

    return queryBuilder;
  };

  const createRepository = () => {
    const transactionManager = {
      delete: jest.fn().mockResolvedValue(undefined),
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
      maternityPackagesRepository: new MaternityPackagesRepository(
        repository as never,
        {} as never,
        {} as never,
      ),
    };
  };

  it('counts only purchased package history as delete dependency', async () => {
    const { repository, maternityPackagesRepository } = createRepository();
    const queryBuilder = createQueryBuilderMock('3');
    repository.manager.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(maternityPackagesRepository.countDependencies('1')).resolves.toBe(3);
    expect(repository.manager.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(queryBuilder.from).toHaveBeenCalledWith('patient_packages', 'patient_packages');
    expect(queryBuilder.from).not.toHaveBeenCalledWith('package_items', 'package_items');
  });

  it('hard deletes package configuration before removing the package', async () => {
    const { repository, transactionManager, maternityPackagesRepository } = createRepository();
    const entity = { id: '1' } as MaternityPackage;

    await maternityPackagesRepository.remove(entity);

    expect(repository.manager.transaction).toHaveBeenCalled();
    expect(transactionManager.delete).toHaveBeenNthCalledWith(1, PackageItem, { packageId: '1' });
    expect(transactionManager.delete).toHaveBeenNthCalledWith(2, PackageStage, { packageId: '1' });
    expect(transactionManager.remove).toHaveBeenCalledWith(MaternityPackage, entity);
  });

  it('applies plain text package search to code, name, and description', () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const maternityPackagesRepository = new MaternityPackagesRepository(
      repository as never,
      {} as never,
      {} as never,
    );

    (maternityPackagesRepository as any).buildBasePackageQuery({ search: 'abc' });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('pkg.code'),
      { search: '%abc%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('pkg.name'),
      { search: '%abc%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('pkg.description'),
      { search: '%abc%' },
    );
  });
});

describe('PublicMaternityPackagesController', () => {
  const activePackage = {
    id: '1',
    status: MaternityPackageStatus.ACTIVE,
  };

  // Vai tro: dam bao API public chi hien package active va van ho tro ca list thuong/phan trang.
  it('forces public list status to active and supports pagination', async () => {
    const service = {
      findAll: jest.fn().mockResolvedValue([activePackage]),
      findAllPaginated: jest.fn().mockResolvedValue({ items: [activePackage], total: 1 }),
    };
    const controller = new PublicMaternityPackagesController(service as never);
    const plainQuery = { search: 'basic' } as SearchMaternityPackageDto;
    const pagedQuery = { page: 1, search: 'vip' } as SearchMaternityPackageDto;

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
    expect(service.findAll).toHaveBeenCalledWith({
      search: 'basic',
      status: MaternityPackageStatus.ACTIVE,
    });
    expect(service.findAllPaginated).toHaveBeenCalledWith({
      page: 1,
      search: 'vip',
      status: MaternityPackageStatus.ACTIVE,
    });
  });

  // Vai tro: dam bao public detail tra package khi package dang active.
  it('returns active package detail', async () => {
    const service = {
      findDetailsById: jest.fn().mockResolvedValue(activePackage),
    };
    const controller = new PublicMaternityPackagesController(service as never);

    await expect(controller.findOne('1')).resolves.toEqual({
      message: MATERNITY_PACKAGE_CONSTANT.DETAIL_FOUND,
      data: activePackage,
    });
  });

  // Vai tro: dam bao public detail khong tra success cho package draft/inactive.
  it('throws not found instead of returning success with null when package is not active', async () => {
    const service = {
      findDetailsById: jest.fn().mockResolvedValue({
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

  // Vai tro: dam bao API public theo facility tra danh sach package kha dung cho facility do.
  it('lists packages available at a facility', async () => {
    const service = createServiceMock();
    const controller = new PublicFacilityMaternityPackagesController(service as never);

    await expect(controller.findAvailablePackagesByFacility('1', { search: 'basic' } as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: [availablePackage],
    });
    expect(service.findAvailableByFacilityId).toHaveBeenCalledWith('1', { search: 'basic' });
  });

  // Vai tro: dam bao API public theo facility chon ham phan trang khi query co page.
  it('uses paginated service when query.page is present', async () => {
    const service = createServiceMock();
    const controller = new PublicFacilityMaternityPackagesController(service as never);

    await expect(controller.findAvailablePackagesByFacility('1', { page: 1, search: 'vip' } as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.FOUND,
      data: { total: 1 },
    });
    expect(service.findAvailableByFacilityIdPaginated).toHaveBeenCalledWith('1', { page: 1, search: 'vip' });
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
    createQuantity: jest.fn().mockResolvedValue({ ...packageEntity, packageType: MaternityPackageType.QUANTITY }),
    createSchedule: jest.fn().mockResolvedValue({ ...packageEntity, packageType: MaternityPackageType.SCHEDULE }),
    findAll: jest.fn().mockResolvedValue([packageEntity]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [packageEntity], total: 1 }),
    findById: jest.fn().mockResolvedValue(packageEntity),
    findDetailsById: jest.fn().mockResolvedValue(packageEntity),
    update: jest.fn().mockResolvedValue({ ...packageEntity, price: '850000.00' }),
    remove: jest.fn().mockResolvedValue({ action: 'hard_deleted', affectedCount: 0 }),
  });

  // Vai tro: dam bao controller quan tri package chon list thuong/phan trang va boc response dung chuan.
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

  // Vai tro: kiem tra CRUD package tra message/data wrapper nhat quan cho FE.
  it('wraps detail, create, update, and remove responses', async () => {
    const service = createServiceMock();
    const controller = new MaternityPackagesController(service as never);

    await expect(controller.findOne('1')).resolves.toMatchObject({ message: MATERNITY_PACKAGE_CONSTANT.DETAIL_FOUND });
    await expect(controller.createQuantity(packageEntity as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.CREATED,
      data: { packageType: MaternityPackageType.QUANTITY },
    });
    await expect(controller.createSchedule(packageEntity as never)).resolves.toMatchObject({
      message: MATERNITY_PACKAGE_CONSTANT.CREATED,
      data: { packageType: MaternityPackageType.SCHEDULE },
    });
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
