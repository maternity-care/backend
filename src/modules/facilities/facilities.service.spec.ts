import {
  BadRequestException,
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
import { Facility } from './entities/facility.entity';

const createFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-1',
  owner: null,
  name: 'Main Clinic',
  code: 'FAC-001',
  ownerId: 'staff-1',
  phone: '0900000000',
  email: 'clinic@example.com',
  openTime: '08:00' as any,
  closeTime: '17:00' as any,
  workingDays: 'mon,tue,wed,thu,fri',
  address: '123 Nguyen Trai',
  province: 'Ho Chi Minh',
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
    findDetailsById: jest.fn(),
    findByCode: jest.fn(),
    findCodesByPrefix: jest.fn(),
    findByName: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    existsActiveOwner: jest.fn(),
    lookup: jest.fn(),
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
    repository.findDetailsById.mockResolvedValue(createFacility());
    repository.findByCode.mockResolvedValue(null);
    repository.findCodesByPrefix.mockResolvedValue([]);
    repository.findByName.mockResolvedValue(null);
    repository.findByEmail.mockResolvedValue(null);
    repository.findByPhone.mockResolvedValue(null);
    repository.existsActiveOwner.mockResolvedValue(true);
    service = new FacilitiesService(repository as any);
  });

  // Vai tro: tao facility khong can client nhap code; backend tu sinh code theo tinh/thanh.
  it('creates a facility with generated code', async () => {
    const { code: _manualCode, ...dto } = createFacility({ id: undefined as any }) as any;
    repository.findCodesByPrefix.mockResolvedValue(['CS-HCM-01', 'CS-HCM-02']);
    repository.findDetailsById.mockResolvedValue(createFacility({ code: 'CS-HCM-03' }));

    await expect(service.create(dto)).resolves.toMatchObject({ code: 'CS-HCM-03', name: dto.name });

    expect(repository.existsActiveOwner).toHaveBeenCalledWith(dto.ownerId);
    expect(repository.findByName).toHaveBeenCalledWith(dto.name);
    expect(repository.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(repository.findByPhone).toHaveBeenCalledWith(dto.phone);
    expect(repository.findCodesByPrefix).toHaveBeenCalledWith('CS-HCM');
    expect(repository.create).toHaveBeenCalledWith({ ...dto, code: 'CS-HCM-03' });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  // Vai tro: sinh ma tinh/thanh theo rule chung lay chu cai dau, khong hardcode danh sach tinh.
  it('generates facility code from province initials without hardcoded aliases', async () => {
    const { code: _manualCode, ...dto } = createFacility({
      id: undefined as any,
      province: 'Ba Ria Vung Tau',
    }) as any;
    repository.findDetailsById.mockResolvedValue(createFacility({ code: 'CS-BRVT-01' }));

    await expect(service.create(dto)).resolves.toMatchObject({ code: 'CS-BRVT-01' });
    expect(repository.findCodesByPrefix).toHaveBeenCalledWith('CS-BRVT');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ code: 'CS-BRVT-01' }));
  });

  // Vai tro: tranh loi FK/500 khi FE gui ownerId khong ton tai hoac staff owner dang inactive.
  it('rejects create when ownerId is not an active staff', async () => {
    repository.existsActiveOwner.mockResolvedValue(false);

    await expect(service.create(createFacility({ id: undefined as any }) as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  // Vai tro: khong cho tao facility trung ten/email/phone voi facility dang ton tai.
  it.each([
    ['name', 'findByName'],
    ['email', 'findByEmail'],
    ['phone', 'findByPhone'],
  ] as const)('rejects create when %s already exists', async (_field, repoMethod) => {
    repository[repoMethod].mockResolvedValue(createFacility({ id: 'fac-2' }));

    await expect(service.create(createFacility({ id: undefined as any }) as any)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao loi DB/repository khi save khong bi nuot mat o tang service.
  it('propagates repository save errors during create', async () => {
    const error = new Error('db down');
    repository.save.mockRejectedValue(error);

    await expect(service.create(createFacility({ id: undefined as any }) as any)).rejects.toBe(error);
  });

  // Vai tro: kiem tra findAll tra dung danh sach facility khi repository co du lieu.
  it('returns all facilities when repository has data', async () => {
    const facilities = [createFacility(), createFacility({ id: 'fac-2', code: 'FAC-002' })];
    repository.findAll.mockResolvedValue(facilities);

    await expect(service.findAll({ province: 'Ho Chi Minh' } as any)).resolves.toBe(facilities);
    expect(repository.findAll).toHaveBeenCalledWith({ province: 'Ho Chi Minh' });
  });

  // Vai tro: dam bao danh sach facility rong/null/undefined duoc tra 404 thay vi success rong.
  it.each([[], null, undefined])('throws not found when findAll returns %p', async (value) => {
    repository.findAll.mockResolvedValue(value as any);

    await expect(service.findAll()).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: kiem tra findAllPaginated tra dung cau truc phan trang khi co item.
  it('returns paginated facilities when items exist', async () => {
    const paged = { items: [createFacility()], total: 1, page: 1, limit: 10 };
    repository.findAllPaginated.mockResolvedValue(paged);

    await expect(service.findAllPaginated({ page: 1, limit: 10 } as any)).resolves.toBe(paged);
  });

  // Vai tro: dam bao ket qua phan trang facility rong cung tra 404 ro rang.
  it.each([null, { items: null }, { items: [] }])('throws not found for empty paginated result %#', async (paged) => {
    repository.findAllPaginated.mockResolvedValue(paged as any);

    await expect(service.findAllPaginated({ page: 1 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: kiem tra service lay dung facility theo id va goi repository dung tham so.
  it('finds a facility by id', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);

    await expect(service.findById('fac-1')).resolves.toBe(facility);
    expect(repository.findById).toHaveBeenCalledWith('fac-1');
  });

  // Vai tro: dam bao id facility khong ton tai se tra NotFoundException.
  it('throws not found when id does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: kiem tra cac ham tim theo code/name duoc uy quyen xuong repository dung cach.
  it('delegates findByCode and findByName to repository', async () => {
    const facility = createFacility();
    repository.findByCode.mockResolvedValue(facility);
    repository.findByName.mockResolvedValue(null);

    await expect(service.findByCode('FAC-001')).resolves.toBe(facility);
    await expect(service.findByName('Unknown')).resolves.toBeNull();
  });

  // Vai tro: update field khong doi dinh danh van save binh thuong, khong query duplicate code khong can thiet.
  it('updates non-identity fields without duplicate code check', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.save.mockImplementation(async (value) => value);
    repository.findDetailsById.mockImplementation(async () => facility);

    await expect(service.update('fac-1', { address: 'New address' } as any)).resolves.toMatchObject({ address: 'New address' });

    expect(repository.findByCode).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(facility);
  });

  // Vai tro: code la field readonly, neu client co gui len update thi service cung bo qua.
  it('ignores manual code during update', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.save.mockImplementation(async (value) => value);
    repository.findDetailsById.mockImplementation(async () => facility);

    await expect(service.update('fac-1', { code: 'FAC-002' } as any)).resolves.toMatchObject({ code: 'FAC-001' });
    expect(repository.findByCode).not.toHaveBeenCalled();
    expect(facility.code).toBe('FAC-001');
  });

  // Vai tro: khong cho update facility sang ten/email/phone cua facility khac.
  it.each([
    [{ name: 'Other Clinic' }, 'findByName'],
    [{ email: 'other@example.com' }, 'findByEmail'],
    [{ phone: '0911111111' }, 'findByPhone'],
  ] as const)('rejects update when identity field is duplicated %#', async (dto, repoMethod) => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository[repoMethod].mockResolvedValue(createFacility({ id: 'fac-2' }));

    await expect(service.update('fac-1', dto as any)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  // Vai tro: doi ownerId phai kiem tra owner moi co ton tai va dang active.
  it('rejects update when new ownerId is invalid', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.existsActiveOwner.mockResolvedValue(false);

    await expect(service.update('fac-1', { ownerId: 'staff-2' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao update id khong ton tai dung ngay o NotFound, khong goi tiep duplicate/save.
  it('does not check duplicate code or save when update id is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing', { code: 'FAC-002' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findByCode).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra rule xoa cung facility khi chua co du lieu phu thuoc.
  it('hard deletes a facility when it has no dependencies', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.countDependencies.mockResolvedValue(0);

    await expect(service.remove('fac-1')).resolves.toEqual({ action: 'hard_deleted', affectedCount: 0 });
    expect(repository.remove).toHaveBeenCalledWith(facility);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra rule xoa mem facility khi da co du lieu lien quan va luu ly do/nguoi xoa.
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

  // Vai tro: dam bao xoa mem van hoat dong khi client khong gui ly do/nguoi xoa.
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

  // Vai tro: dam bao remove facility khong ton tai se dung lai va khong dem dependency/xoa.
  it('does not delete when remove target is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.countDependencies).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra ham deActivateFacility chuyen viec cap nhat trang thai xuong repository.
  it('delegates facility deactivation to repository', async () => {
    const inactive = createFacility({ status: FacilityStatus.INACTIVE });
    repository.deActivateFacility.mockResolvedValue(inactive);

    await expect(service.deActivateFacility('fac-1')).resolves.toBe(inactive);
    expect(repository.deActivateFacility).toHaveBeenCalledWith('fac-1');
  });

  // Vai tro: cung cap lookup facility cho FE select/autocomplete ma khong can tu ghep API list/filter.
  it('delegates facility lookup to repository', async () => {
    const options = [{
      id: 'fac-1',
      name: 'Main Clinic',
      code: 'FAC-001',
      address: '123 Nguyen Trai',
      province: 'Ho Chi Minh',
      ward: 'Ben Nghe',
      status: FacilityStatus.ACTIVE,
      ownerName: 'Owner',
    }];
    repository.lookup.mockResolvedValue(options);

    await expect(service.lookup({ search: 'main' })).resolves.toBe(options);
    expect(repository.lookup).toHaveBeenCalledWith({ search: 'main' });
  });

  // Vai tro: dam bao loi khi deactivate facility duoc nem ra dung nhu repository/service ben duoi.
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
    findDetailsById: jest.fn(),
    lookup: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    deActivateFacility: jest.fn(),
  });

  // Vai tro: dam bao admin co so chi xem duoc facility dang active cua chinh minh.
  it('limits a facility admin list request to their active facility', async () => {
    const mockService = createService();
    const facility = createFacility();
    mockService.findDetailsById.mockResolvedValue(facility);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(facilityAdmin, { page: 2 } as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
      data: { items: [facility], total: 1, page: 2, limit: 1 },
    });
    expect(mockService.findAllPaginated).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra controller dung service phan trang khi super admin gui query page.
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

  // Vai tro: kiem tra controller dung service danh sach thuong khi khong co page.
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

  // Vai tro: chan user co scope facility truy cap chi tiet facility khac.
  it('denies findOne when user tries to access another facility', async () => {
    const mockService = createService();
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findOne(facilityAdmin, 'fac-2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockService.findById).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao API create facility tra response wrapper dung message/data cho FE.
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

  // Vai tro: dam bao controller giu nguyen loi HTTP da biet, khong bien thanh 500 sai nghia.
  it('rethrows known HttpException from controller service calls', async () => {
    const mockService = createService();
    mockService.create.mockRejectedValue(new ConflictException(RESPONSE_MESSAGES.FACILITY_ALREADY_EXISTS));
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.create({ code: 'FAC-001' } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  // Vai tro: dam bao controller truyen ly do xoa va userId xuong service de audit xoa mem.
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

  // Vai tro: kiem tra deactivate facility co check quyen va tra wrapper thanh cong dung chuan.
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

  // Vai tro: dam bao loi bat ngo o controller duoc chuan hoa thanh InternalServerErrorException.
  it('converts unknown controller errors to internal server error', async () => {
    const mockService = createService();
    mockService.findAll.mockRejectedValue(new Error('unexpected'));
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(superAdmin, {} as any)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
