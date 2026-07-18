import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FacilityStatus } from '../../common/constants/status.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { Facility } from './entities/facilities.entity';

const createFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-1',
  name: 'Main Clinic',
  code: 'FAC-001',
  phone: '0900000000',
  email: 'clinic@example.com',
  open_time: '08:00' as any,
  close_time: '17:00' as any,
  working_days: 'mon,tue,wed,thu,fri',
  address: '123 Nguyen Trai',
  province: 'Ho Chi Minh',
  district: 'District 1',
  ward: 'Ben Nghe',
  latitude: '10.7756000',
  longitude: '106.6871000',
  status: FacilityStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  ...overrides,
});

describe('FacilitiesService', () => {
  const createRepository = () => ({
    create: jest.fn((dto) => ({ id: 'draft', ...dto })),
    save: jest.fn(async (facility) => ({ ...facility, id: facility.id === 'draft' ? 'fac-1' : facility.id })),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findByName: jest.fn(),
    remove: jest.fn(),
    countDependencies: jest.fn(),
    softDelete: jest.fn(),
    updateStatus: jest.fn(),
    deActivateFacility: jest.fn(),
  });

  let repository: ReturnType<typeof createRepository>;
  let service: FacilitiesService;

  beforeEach(() => {
    repository = createRepository();
    service = new FacilitiesService(repository as any);
  });

  it('creates a facility when code is unique', async () => {
    const dto = createFacility({ id: undefined as any }) as any;
    repository.findByCode.mockResolvedValue(null);

    await expect(service.create(dto)).resolves.toMatchObject({ code: dto.code, name: dto.name });

    expect(repository.findByCode).toHaveBeenCalledWith(dto.code);
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects create when code already exists', async () => {
    repository.findByCode.mockResolvedValue(createFacility());

    await expect(service.create({ code: 'FAC-001' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates repository save errors during create', async () => {
    const error = new Error('db down');
    repository.findByCode.mockResolvedValue(null);
    repository.save.mockRejectedValue(error);

    await expect(service.create({ code: 'FAC-NEW' } as any)).rejects.toBe(error);
  });

  it('returns all facilities when repository has data', async () => {
    const facilities = [createFacility(), createFacility({ id: 'fac-2', code: 'FAC-002' })];
    repository.findAll.mockResolvedValue(facilities);

    await expect(service.findAll({ province: 'Ho Chi Minh' } as any)).resolves.toBe(facilities);
    expect(repository.findAll).toHaveBeenCalledWith({ province: 'Ho Chi Minh' });
  });

  it.each([[], null, undefined])('throws not found when findAll returns %p', async (value) => {
    repository.findAll.mockResolvedValue(value as any);

    await expect(service.findAll()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns paginated facilities when items exist', async () => {
    const paged = { items: [createFacility()], total: 1, page: 1, limit: 10 };
    repository.findAllPaginated.mockResolvedValue(paged);

    await expect(service.findAllPaginated({ page: 1, limit: 10 } as any)).resolves.toBe(paged);
  });

  it.each([null, { items: null }, { items: [] }])('throws not found for empty paginated result %#', async (paged) => {
    repository.findAllPaginated.mockResolvedValue(paged as any);

    await expect(service.findAllPaginated({ page: 1 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finds a facility by id', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);

    await expect(service.findById('fac-1')).resolves.toBe(facility);
    expect(repository.findById).toHaveBeenCalledWith('fac-1');
  });

  it('throws not found when id does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates findByCode and findByName to repository', async () => {
    const facility = createFacility();
    repository.findByCode.mockResolvedValue(facility);
    repository.findByName.mockResolvedValue(null);

    await expect(service.findByCode('FAC-001')).resolves.toBe(facility);
    await expect(service.findByName('Unknown')).resolves.toBeNull();
  });

  it('updates without duplicate check when code is unchanged or absent', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.save.mockImplementation(async (value) => value);

    await expect(service.update('fac-1', { name: 'New name' } as any)).resolves.toMatchObject({ name: 'New name' });

    expect(repository.findByCode).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(facility);
  });

  it('updates to a new code when the new code is unique', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.findByCode.mockResolvedValue(null);
    repository.save.mockImplementation(async (value) => value);

    await expect(service.update('fac-1', { code: 'FAC-002' } as any)).resolves.toMatchObject({ code: 'FAC-002' });
  });

  it('rejects update when the new code belongs to another facility', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.findByCode.mockResolvedValue(createFacility({ id: 'fac-2', code: 'FAC-002' }));

    await expect(service.update('fac-1', { code: 'FAC-002' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(facility.code).toBe('FAC-001');
  });

  it('does not check duplicate code or save when update id is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing', { code: 'FAC-002' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findByCode).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('hard deletes a facility when it has no dependencies', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.countDependencies.mockResolvedValue(0);

    await expect(service.remove('fac-1')).resolves.toEqual({ action: 'hard_deleted', affectedCount: 0 });
    expect(repository.remove).toHaveBeenCalledWith(facility);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('soft deletes a facility when dependencies exist', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.countDependencies.mockResolvedValue(3);

    await expect(service.remove('fac-1', 'merge branch', 'user-9')).resolves.toEqual({
      action: 'soft_deleted',
      affectedCount: 3,
    });
    expect(repository.softDelete).toHaveBeenCalledWith(facility, 'merge branch', 'user-9');
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('soft deletes a facility even when optional metadata is omitted', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.countDependencies.mockResolvedValue(1);

    await expect(service.remove('fac-1')).resolves.toEqual({
      action: 'soft_deleted',
      affectedCount: 1,
    });
    expect(repository.softDelete).toHaveBeenCalledWith(facility, undefined, undefined);
  });

  it('does not delete when remove target is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.countDependencies).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('delegates facility deactivation to repository', async () => {
    const inactive = createFacility({ status: FacilityStatus.INACTIVE });
    repository.deActivateFacility.mockResolvedValue(inactive);

    await expect(service.deActivateFacility('fac-1')).resolves.toBe(inactive);
    expect(repository.deActivateFacility).toHaveBeenCalledWith('fac-1');
  });

  it('propagates repository errors during deactivation', async () => {
    const error = new NotFoundException(RESPONSE_MESSAGES.FACILITY_NOT_FOUND);
    repository.deActivateFacility.mockRejectedValue(error);

    await expect(service.deActivateFacility('missing')).rejects.toBe(error);
  });
});

describe('FacilitiesController', () => {
  const superAdmin = {
    id: 'user-super',
    roles: [{ name: RoleEnum.SUPER_ADMIN }],
    facilities: [],
  } as any;

  const facilityAdmin = {
    id: 'user-admin',
    activeFacilityId: 'fac-1',
    roles: [{ name: RoleEnum.ADMIN }],
    facilities: [{ id: 'fac-1', status: FacilityStatus.ACTIVE, roles: [{ name: RoleEnum.ADMIN }] }],
  } as any;

  const createService = () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    deActivateFacility: jest.fn(),
  });

  it('limits a facility admin list request to their active facility', async () => {
    const mockService = createService();
    const facility = createFacility();
    mockService.findById.mockResolvedValue(facility);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(facilityAdmin, { page: 2 } as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
      data: { items: [facility], total: 1, page: 2, limit: 1 },
    });
    expect(mockService.findAllPaginated).not.toHaveBeenCalled();
  });

  it('uses paginated service for super admin when page is provided', async () => {
    const mockService = createService();
    const paged = { items: [createFacility()], total: 1, page: 1, limit: 10 };
    mockService.findAllPaginated.mockResolvedValue(paged);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(superAdmin, { page: 1, limit: 10 } as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
      data: paged,
    });
  });

  it('uses non-paginated service for super admin when page is omitted', async () => {
    const mockService = createService();
    const facilities = [createFacility()];
    mockService.findAll.mockResolvedValue(facilities);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(superAdmin, {} as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
      data: facilities,
    });
    expect(mockService.findAll).toHaveBeenCalledWith({});
  });

  it('denies findOne when user tries to access another facility', async () => {
    const mockService = createService();
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findOne(facilityAdmin, 'fac-2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockService.findById).not.toHaveBeenCalled();
  });

  it('wraps create response with message and data', async () => {
    const mockService = createService();
    const facility = createFacility();
    mockService.create.mockResolvedValue(facility);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.create({ code: 'FAC-001' } as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITY_CREATED,
      data: facility,
    });
  });

  it('rethrows known HttpException from controller service calls', async () => {
    const mockService = createService();
    mockService.create.mockRejectedValue(new ConflictException(RESPONSE_MESSAGES.FACILITY_ALREADY_EXISTS));
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.create({ code: 'FAC-001' } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('passes delete reason and current user id to service remove', async () => {
    const mockService = createService();
    mockService.remove.mockResolvedValue({ action: 'soft_deleted', affectedCount: 2 });
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.remove(facilityAdmin, 'fac-1', 'duplicate')).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITY_DELETED,
      data: { action: 'soft_deleted', affectedCount: 2 },
    });
    expect(mockService.remove).toHaveBeenCalledWith('fac-1', 'duplicate', 'user-admin');
  });

  it('wraps deactivation response after facility access check', async () => {
    const mockService = createService();
    const inactive = createFacility({ status: FacilityStatus.INACTIVE });
    mockService.deActivateFacility.mockResolvedValue(inactive);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.deActivateFacility(facilityAdmin, 'fac-1', {} as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITY_STATUS_UPDATED,
      data: inactive,
    });
  });

  it('converts unknown controller errors to internal server error', async () => {
    const mockService = createService();
    mockService.findAll.mockRejectedValue(new Error('unexpected'));
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(superAdmin, {} as any)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
