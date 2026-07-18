import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ActiveStatus,
  AvailabilityStatus,
  FacilityStatus,
} from '../../common/constants/status.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FACILITY_SERVICE_CONSTANT } from '../../common/constants/facility-service.constant';
import { ServiceType } from '../services/dto/requests/create-service.dto';
import { CreateFacilityServiceDto } from './dto/requests/create-facility-service.dto';
import { SearchFacilityServiceDto } from './dto/requests/search-facility-service.dto';
import { FacilityServicesController } from './facility-services.controller';
import { FacilityServicesService } from './facility-services.service';
import { PublicFacilityServicesController } from './public-facility-services.controller';

describe('FacilityServices DTO validation', () => {
  const validPayload = {
    facilityId: '1',
    serviceId: '2',
    price: '280000.00',
    durationMinutes: '30',
    status: AvailabilityStatus.AVAILABLE,
  };

  it('accepts a valid create payload and transforms duration', async () => {
    const dto = plainToInstance(CreateFacilityServiceDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.durationMinutes).toBe(30);
  });

  it.each([
    [{ ...validPayload, facilityId: '0' }, 'facilityId'],
    [{ ...validPayload, serviceId: '-1' }, 'serviceId'],
    [{ ...validPayload, price: '-1000' }, 'price'],
    [{ ...validPayload, durationMinutes: 3 }, 'durationMinutes'],
    [{ ...validPayload, status: 'active' }, 'status'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateFacilityServiceDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  it('validates search filters and pagination', async () => {
    const dto = plainToInstance(SearchFacilityServiceDto, {
      facilityId: '0',
      serviceType: 'invalid',
      status: 'active',
      page: '0',
      limit: '101',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['facilityId', 'serviceType', 'status', 'page', 'limit']),
    );
  });
});

describe('FacilityServicesService business logic', () => {
  const facility = { id: '1', status: FacilityStatus.ACTIVE };
  const service = { id: '2', status: ActiveStatus.ACTIVE, serviceType: ServiceType.ULTRASOUND };
  const entity = {
    id: '10',
    facilityId: '1',
    serviceId: '2',
    price: '280000.00',
    durationMinutes: 30,
    status: AvailabilityStatus.AVAILABLE,
  };

  const createRepo = () => ({
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async data => ({ id: data.id ?? '10', ...data })),
    remove: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue({ ...entity }),
    findByFacilityAndService: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([{ ...entity }]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [{ ...entity }], total: 1 }),
    findPublicByFacilityId: jest.fn().mockResolvedValue([{ ...entity, serviceName: 'Siêu âm thai 2D' }]),
    countDependencies: jest.fn().mockResolvedValue(0),
    updateStatus: jest.fn(async (item, status) => ({ ...item, status })),
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

  it('creates a facility service after validating facility and service', async () => {
    const { repo, service: facilityServicesService } = createService();
    await expect(facilityServicesService.create(entity as never)).resolves.toMatchObject({ id: '10' });
    expect(facilitiesService.findById).toHaveBeenCalledWith('1');
    expect(servicesService.findById).toHaveBeenCalledWith('2');
    expect(repo.findByFacilityAndService).toHaveBeenCalledWith('1', '2');
  });

  it('returns list, paginated list, public list, and details through repository', async () => {
    const { repo, service: facilityServicesService } = createService();

    await expect(facilityServicesService.findAll({ facilityId: '1' })).resolves.toEqual([{ ...entity }]);
    await expect(facilityServicesService.findAllPaginated({ page: 1, limit: 20 })).resolves.toEqual({
      items: [{ ...entity }],
      total: 1,
    });
    await expect(facilityServicesService.findPublicByFacilityId('1', { status: AvailabilityStatus.AVAILABLE })).resolves.toEqual([
      expect.objectContaining({ id: '10', serviceName: expect.any(String) }),
    ]);
    await expect(facilityServicesService.findDetailsById('10')).resolves.toEqual({ ...entity });
    expect(repo.findPublicByFacilityId).toHaveBeenCalledWith('1', { status: AvailabilityStatus.AVAILABLE });
  });

  it('rejects public facility services when facility is inactive', async () => {
    facilitiesService.findById.mockResolvedValueOnce({ ...facility, status: FacilityStatus.INACTIVE });

    await expect(createService().service.findPublicByFacilityId('1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicated mapping or inactive references', async () => {
    const duplicateContext = createService();
    duplicateContext.repo.findByFacilityAndService.mockResolvedValueOnce(entity);
    await expect(duplicateContext.service.create(entity as never)).rejects.toBeInstanceOf(ConflictException);

    facilitiesService.findById.mockResolvedValueOnce({ ...facility, status: FacilityStatus.INACTIVE });
    await expect(createService().service.create(entity as never)).rejects.toBeInstanceOf(ConflictException);

    servicesService.findById.mockResolvedValueOnce({ ...service, status: ActiveStatus.INACTIVE });
    await expect(createService().service.create(entity as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a facility service and checks duplicate pair when facility/service changes', async () => {
    const { repo, service: facilityServicesService } = createService();
    await expect(facilityServicesService.update('10', { price: '300000.00' })).resolves.toMatchObject({
      price: '300000.00',
    });
    expect(repo.save).toHaveBeenCalled();
  });

  it('rejects update when changed facility-service pair belongs to another mapping', async () => {
    const context = createService();
    context.repo.findByFacilityAndService.mockResolvedValueOnce({ ...entity, id: '99' });

    await expect(context.service.update('10', { serviceId: '3' })).rejects.toBeInstanceOf(ConflictException);
    expect(context.repo.save).not.toHaveBeenCalled();
  });

  it('does not check duplicate pair when update only changes price or status', async () => {
    const { repo, service: facilityServicesService } = createService();

    await expect(facilityServicesService.update('10', { price: '310000.00' })).resolves.toMatchObject({
      price: '310000.00',
    });
    expect(repo.findByFacilityAndService).not.toHaveBeenCalled();
  });

  it('throws not found when mapping does not exist', async () => {
    const context = createService();
    context.repo.findById.mockResolvedValueOnce(null);
    await expect(context.service.findById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws not found when mapping details do not exist', async () => {
    const context = createService();
    context.repo.findDetailsById = jest.fn().mockResolvedValueOnce(null);

    await expect(context.service.findDetailsById('99')).rejects.toBeInstanceOf(NotFoundException);
  });

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
    expect(softContext.repo.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: '10' }),
      AvailabilityStatus.UNAVAILABLE,
    );
  });
});

describe('FacilityServicesController', () => {
  const entity = {
    id: '10',
    facilityId: '1',
    serviceId: '2',
    price: '280000.00',
    durationMinutes: 30,
    status: AvailabilityStatus.AVAILABLE,
  };

  const createServiceMock = () => ({
    create: jest.fn().mockResolvedValue(entity),
    findAll: jest.fn().mockResolvedValue([entity]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [entity], total: 1, page: 1, limit: 20 }),
    findDetailsById: jest.fn().mockResolvedValue({ ...entity, serviceName: 'Sieu am' }),
    update: jest.fn().mockResolvedValue({ ...entity, price: '300000.00' }),
    remove: jest.fn().mockResolvedValue({ action: 'soft_deleted', affectedCount: 1 }),
    findPublicByFacilityId: jest.fn().mockResolvedValue([entity]),
  });

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

  it('wraps detail, create, update, and remove responses', async () => {
    const service = createServiceMock();
    const controller = new FacilityServicesController(service as never);

    await expect(controller.findOne('10')).resolves.toMatchObject({ message: FACILITY_SERVICE_CONSTANT.DETAIL_FOUND });
    await expect(controller.create(entity as never)).resolves.toMatchObject({ message: FACILITY_SERVICE_CONSTANT.CREATED, data: entity });
    await expect(controller.update('10', { price: '300000.00' })).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.UPDATED,
      data: { price: '300000.00' },
    });
    await expect(controller.remove('10')).resolves.toMatchObject({
      message: FACILITY_SERVICE_CONSTANT.DELETED,
      data: { action: 'soft_deleted' },
    });
  });

  it('wraps public facility service response', async () => {
    const service = createServiceMock();
    const controller = new PublicFacilityServicesController(service as never);

    await expect(controller.findServicesByFacility('1', { serviceType: ServiceType.ULTRASOUND } as never)).resolves.toEqual({
      message: RESPONSE_MESSAGES.SUCCESS,
      data: [entity],
    });
    expect(service.findPublicByFacilityId).toHaveBeenCalledWith('1', { serviceType: ServiceType.ULTRASOUND });
  });
});
