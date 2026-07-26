import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ActiveStatus, FacilityOperatingStatus, FacilityStatus } from '../../common/constants/status.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { Facility } from './entities/facility.entity';
import { FacilityClosureDay } from './entities/facility-closure-day.entity';

const createFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-1',
  owner: null,
  facilityServices: [],
  appointments: [],
  name: 'Main Clinic',
  code: 'FAC-001',
  ownerId: 'staff-1',
  phone: '0900000000',
  email: 'clinic@example.com',
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

const createClosureDay = (overrides: Partial<FacilityClosureDay> = {}): FacilityClosureDay => ({
  id: 'closure-1',
  facility: null as any,
  facilityId: 'fac-1',
  closureDate: '2026-09-02',
  reason: 'Nghi le Quoc khanh',
  status: ActiveStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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
    syncOperatingHours: jest.fn(),
    findOperatingHoursByFacilityId: jest.fn(),
    findActiveShiftsForOperatingHourValidation: jest.fn(),
    createClosureDay: jest.fn((dto) => createClosureDay(dto)),
    saveClosureDay: jest.fn(async (closureDay) => closureDay),
    removeClosureDay: jest.fn(async () => undefined),
    findClosureDaysByFacilityId: jest.fn(),
    findClosureDayById: jest.fn(),
    findClosureDayByDate: jest.fn(),
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
    repository.syncOperatingHours.mockResolvedValue(undefined);
    repository.findOperatingHoursByFacilityId.mockResolvedValue([]);
    repository.findActiveShiftsForOperatingHourValidation.mockResolvedValue([]);
    repository.findClosureDaysByFacilityId.mockResolvedValue([]);
    repository.findClosureDayById.mockResolvedValue(null);
    repository.findClosureDayByDate.mockResolvedValue(null);
    repository.existsActiveOwner.mockResolvedValue(true);
    service = new FacilitiesService(repository as any);
  });

  afterEach(() => {
    jest.useRealTimers();
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
    expect(repository.syncOperatingHours).toHaveBeenCalledWith('fac-1', expect.arrayContaining([
      expect.objectContaining({ dayOfWeek: 'MON', openTime: '07:00:00', closeTime: '17:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'SUN', openTime: null, closeTime: null, isClosed: true }),
    ]));
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

  // Vai tro: khi validate trung facility, response loi phai tra kem record dang bi trung de FE hien thi ro.
  it('returns duplicated facility data when create identity is duplicated', async () => {
    const duplicatedFacility = createFacility({ id: 'fac-2', name: 'Existing Clinic' });
    repository.findByName.mockResolvedValue(duplicatedFacility);

    let error: ConflictException | undefined;
    try {
      await service.create(createFacility({ id: undefined as any, name: 'Existing Clinic' }) as any);
    } catch (caughtError) {
      error = caughtError as ConflictException;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect(error!.getResponse()).toMatchObject({
      message: RESPONSE_MESSAGES.FACILITY_ALREADY_EXISTS,
      data: {
        duplicatedField: 'name',
        duplicatedData: {
          id: 'fac-2',
          code: duplicatedFacility.code,
          name: 'Existing Clinic',
          phone: duplicatedFacility.phone,
          email: duplicatedFacility.email,
          status: duplicatedFacility.status,
        },
      },
    });
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

    await expect(service.findAll({ province: 'Ho Chi Minh' } as any)).resolves.toEqual([
      expect.objectContaining({
        id: 'fac-1',
        operatingHours: expect.arrayContaining([expect.objectContaining({ dayOfWeek: 'MON', isClosed: false })]),
        operatingHourGroups: expect.arrayContaining([expect.objectContaining({ displayTime: '07:00 - 17:00' })]),
        closureDays: [],
      }),
      expect.objectContaining({
        id: 'fac-2',
        operatingHours: expect.arrayContaining([expect.objectContaining({ dayOfWeek: 'MON', isClosed: false })]),
        operatingHourGroups: expect.arrayContaining([expect.objectContaining({ displayTime: '07:00 - 17:00' })]),
        closureDays: [],
      }),
    ]);
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

    await expect(service.findAllPaginated({ page: 1, limit: 10 } as any)).resolves.toEqual({
      ...paged,
      items: [expect.objectContaining({
        id: 'fac-1',
        operatingHours: expect.arrayContaining([expect.objectContaining({ dayOfWeek: 'MON', isClosed: false })]),
        operatingHourGroups: expect.arrayContaining([expect.objectContaining({ displayTime: '07:00 - 17:00' })]),
        closureDays: [],
      })],
    });
  });

  // Vai tro: tinh trang thai dong/mo cua dong theo gio hien tai o Viet Nam, khong luu vao DB.
  it('adds open operating status when current Vietnam time is inside today operating hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T03:00:00.000Z')); // 10:00 ngay 08/07/2026 o Viet Nam.
    repository.findDetailsById.mockResolvedValue(createFacility());

    await expect(service.findDetailsById('fac-1')).resolves.toMatchObject({
      id: 'fac-1',
      operatingStatus: FacilityOperatingStatus.OPEN,
      operatingStatusLabel: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_OPEN,
      isOpenNow: true,
      todayOperatingHour: expect.objectContaining({
        dayOfWeek: 'WED',
        openTime: '07:00:00',
        closeTime: '17:00:00',
        isClosed: false,
      }),
    });
  });

  // Vai tro: neu qua gio dong cua thi response tu dong tra trang thai da dong cua.
  it('adds closed operating status when current Vietnam time is outside today operating hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T12:00:00.000Z')); // 19:00 ngay 08/07/2026 o Viet Nam.
    repository.findDetailsById.mockResolvedValue(createFacility());

    await expect(service.findDetailsById('fac-1')).resolves.toMatchObject({
      operatingStatus: FacilityOperatingStatus.CLOSED,
      operatingStatusLabel: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_CLOSED,
      isOpenNow: false,
      todayOperatingHour: expect.objectContaining({ dayOfWeek: 'WED' }),
    });
  });

  // Vai tro: neu hom nay nam trong facility_closure_days active thi uu tien tra hom nay dong cua.
  it('adds closed-today operating status when today is an active closure day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T03:00:00.000Z'));
    repository.findDetailsById.mockResolvedValue(createFacility());
    repository.findClosureDaysByFacilityId.mockResolvedValue([{
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-07-08',
      reason: 'Bao tri',
      status: ActiveStatus.ACTIVE,
    }]);

    await expect(service.findDetailsById('fac-1')).resolves.toMatchObject({
      operatingStatus: FacilityOperatingStatus.CLOSED_TODAY,
      operatingStatusLabel: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_CLOSED_TODAY,
      isOpenNow: false,
    });
  });

  // Vai tro: facility inactive/deleted khong duoc hien la dang mo cua ke ca trong gio lam viec.
  it('adds inactive operating status when facility lifecycle status is inactive', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T03:00:00.000Z'));
    repository.findDetailsById.mockResolvedValue(createFacility({ status: FacilityStatus.INACTIVE }));

    await expect(service.findDetailsById('fac-1')).resolves.toMatchObject({
      status: FacilityStatus.INACTIVE,
      operatingStatus: FacilityOperatingStatus.INACTIVE,
      operatingStatusLabel: RESPONSE_MESSAGES.FACILITIES.OPERATING_STATUS_INACTIVE,
      isOpenNow: false,
    });
  });

  // Vai tro: cap nhat khung gio hoat dong theo nhom ngay va tra ve group de landing page hien thi truc tiep.
  it('updates grouped operating hours and returns display groups for landing page', async () => {
    const facility = createFacility();
    repository.findById.mockResolvedValue(facility);
    repository.findOperatingHoursByFacilityId
      .mockResolvedValueOnce([
        { dayOfWeek: 'MON', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false },
        { dayOfWeek: 'TUE', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false },
        { dayOfWeek: 'WED', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false },
        { dayOfWeek: 'THU', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false },
        { dayOfWeek: 'FRI', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false },
        { dayOfWeek: 'SAT', openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
        { dayOfWeek: 'SUN', openTime: null, closeTime: null, isClosed: true },
      ]);

    await expect(service.updateOperatingHours('fac-1', {
      schedules: [
        { days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as any, openTime: '07:00:00', closeTime: '19:00:00', isClosed: false },
        { days: ['SAT'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
        { days: ['SUN'] as any, isClosed: true },
      ],
    })).resolves.toEqual({
      operatingHours: expect.any(Array),
      operatingHourGroups: [
        expect.objectContaining({ dayLabel: 'Thứ 2 - Thứ 6', displayTime: '07:00 - 19:00' }),
        expect.objectContaining({ dayLabel: 'Thứ 7', displayTime: '08:00 - 17:00' }),
        expect.objectContaining({ dayLabel: 'Chủ nhật', displayTime: 'Đóng cửa' }),
      ],
    });

    expect(repository.syncOperatingHours).toHaveBeenCalledWith('fac-1', [
      expect.objectContaining({ dayOfWeek: 'MON', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'TUE', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'WED', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'THU', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'FRI', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'SAT', openTime: '08:00:00', closeTime: '17:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'SUN', openTime: null, closeTime: null, isClosed: true }),
    ]);
  });

  // Vai tro: neu thu hep gio hoat dong lam shift sap toi bi nam ngoai khung gio moi thi phai chan cap nhat.
  it('rejects operating hour updates that would make upcoming active shifts invalid', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-24T03:00:00.000Z'));
    repository.findById.mockResolvedValue(createFacility());
    repository.findOperatingHoursByFacilityId.mockResolvedValue([]);
    repository.findActiveShiftsForOperatingHourValidation.mockResolvedValue([
      {
        id: 'shift-1',
        shiftDate: '2026-07-27',
        startTime: '07:00:00',
        endTime: '12:00:00',
        status: 'available',
        doctorName: 'Bac si An',
        roomName: 'Phong 101',
        slotName: 'Ca sang',
      },
    ]);

    let error: ConflictException | undefined;
    try {
      await service.updateOperatingHours('fac-1', {
        schedules: [
          { days: ['MON'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
        ],
      });
    } catch (caughtError) {
      error = caughtError as ConflictException;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect(error!.getResponse()).toMatchObject({
      data: {
        duplicatedField: 'operatingHours',
        impactedShifts: [
          expect.objectContaining({
            id: 'shift-1',
            shiftDate: '2026-07-27',
            startTime: '07:00:00',
            endTime: '12:00:00',
            doctorName: 'Bac si An',
          }),
        ],
      },
    });
    expect(repository.findActiveShiftsForOperatingHourValidation).toHaveBeenCalledWith('fac-1', '2026-07-24');
    expect(repository.syncOperatingHours).not.toHaveBeenCalled();
  });

  // Vai tro: preview gio hoat dong chi tra danh sach shift bi anh huong, khong ghi DB.
  it('previews operating hour impacts without saving changes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-24T03:00:00.000Z'));
    repository.findById.mockResolvedValue(createFacility());
    repository.findOperatingHoursByFacilityId.mockResolvedValue([]);
    repository.findActiveShiftsForOperatingHourValidation.mockResolvedValue([
      {
        id: 'shift-1',
        shiftDate: '2026-07-27',
        startTime: '07:00:00',
        endTime: '12:00:00',
        status: 'available',
        doctorName: 'Bac si An',
      },
    ]);

    await expect(service.previewOperatingHours('fac-1', {
      schedules: [
        { days: ['MON'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    })).resolves.toMatchObject({
      canUpdate: false,
      summary: { impactedShiftCount: 1 },
      impactedShifts: [
        expect.objectContaining({
          id: 'shift-1',
          reason: 'Ca bat dau truoc gio mo cua moi 08:00:00',
        }),
      ],
    });
    expect(repository.syncOperatingHours).not.toHaveBeenCalled();
  });

  // Vai tro: mo rong gio hoat dong khong lam shift cu bi sai nen van cho cap nhat.
  it('allows operating hour updates when upcoming shifts still fit the new wider hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-24T03:00:00.000Z'));
    repository.findById.mockResolvedValue(createFacility());
    repository.findOperatingHoursByFacilityId
      .mockResolvedValueOnce([
        { dayOfWeek: 'MON', openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ])
      .mockResolvedValueOnce([
        { dayOfWeek: 'MON', openTime: '07:00:00', closeTime: '17:00:00', isClosed: false },
      ]);
    repository.findActiveShiftsForOperatingHourValidation.mockResolvedValue([
      {
        id: 'shift-1',
        shiftDate: '2026-07-27',
        startTime: '08:00:00',
        endTime: '12:00:00',
        status: 'available',
      },
    ]);

    await expect(service.updateOperatingHours('fac-1', {
      schedules: [
        { days: ['MON'] as any, openTime: '07:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    })).resolves.toMatchObject({
      operatingHours: expect.any(Array),
    });
    expect(repository.syncOperatingHours).toHaveBeenCalled();
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

  // Vai tro: lay danh sach ngay dong cua co filter ngay bat dau/ket thuc/trang thai.
  it('returns facility closure days with filters', async () => {
    const facility = createFacility();
    const closureDays = [{
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
      status: ActiveStatus.ACTIVE,
    }];
    repository.findById.mockResolvedValue(facility);
    repository.findClosureDaysByFacilityId.mockResolvedValue(closureDays);

    await expect(service.getClosureDays('fac-1', {
      fromDate: '2026-09-01',
      toDate: '2026-09-03',
      status: ActiveStatus.ACTIVE,
    })).resolves.toBe(closureDays);

    expect(repository.findClosureDaysByFacilityId).toHaveBeenCalledWith('fac-1', {
      fromDate: '2026-09-01',
      toDate: '2026-09-03',
      status: ActiveStatus.ACTIVE,
    });
  });

  // Vai tro: bat loi query ngay sai thu tu de tranh FE gui fromDate lon hon toDate.
  it('rejects invalid closure day date range', async () => {
    repository.findById.mockResolvedValue(createFacility());

    await expect(service.getClosureDays('fac-1', {
      fromDate: '2026-09-03',
      toDate: '2026-09-01',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findClosureDaysByFacilityId).not.toHaveBeenCalled();
  });

  // Vai tro: tao ngay dong cua thu cong cho co so va default status la active.
  it('creates a facility closure day', async () => {
    repository.findById.mockResolvedValue(createFacility());
    repository.saveClosureDay.mockResolvedValue(createClosureDay());

    await expect(service.createClosureDay('fac-1', {
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
    })).resolves.toEqual({
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
      status: ActiveStatus.ACTIVE,
    });

    expect(repository.createClosureDay).toHaveBeenCalledWith({
      facilityId: 'fac-1',
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
      status: ActiveStatus.ACTIVE,
    });
  });

  // Vai tro: khong cho tao trung ngay dong cua trong cung mot co so va tra data record bi trung.
  it('rejects duplicated facility closure day date', async () => {
    const duplicated = createClosureDay();
    repository.findById.mockResolvedValue(createFacility());
    repository.findClosureDayByDate.mockResolvedValue(duplicated);

    let error: ConflictException | undefined;
    try {
      await service.createClosureDay('fac-1', { closureDate: '2026-09-02' });
    } catch (caughtError) {
      error = caughtError as ConflictException;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect(error!.getResponse()).toMatchObject({
      message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.ALREADY_EXISTS,
      data: {
        duplicatedField: 'closureDate',
        duplicatedData: {
          id: 'closure-1',
          facilityId: 'fac-1',
          closureDate: '2026-09-02',
          status: ActiveStatus.ACTIVE,
        },
      },
    });
    expect(repository.createClosureDay).not.toHaveBeenCalled();
  });

  // Vai tro: cap nhat ngay dong cua va check trung neu doi sang ngay khac.
  it('updates a facility closure day', async () => {
    const closureDay = createClosureDay();
    repository.findById.mockResolvedValue(createFacility());
    repository.findClosureDayById.mockResolvedValue(closureDay);
    repository.saveClosureDay.mockImplementation(async (value) => value);

    await expect(service.updateClosureDay('fac-1', 'closure-1', {
      closureDate: '2026-09-03',
      reason: 'Bao tri dot xuat',
      status: ActiveStatus.INACTIVE,
    })).resolves.toEqual({
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-09-03',
      reason: 'Bao tri dot xuat',
      status: ActiveStatus.INACTIVE,
    });

    expect(repository.findClosureDayByDate).toHaveBeenCalledWith('fac-1', '2026-09-03');
    expect(repository.saveClosureDay).toHaveBeenCalledWith(closureDay);
  });

  // Vai tro: xoa record ngay dong cua khi admin nhap nham lich nghi.
  it('removes a facility closure day', async () => {
    const closureDay = createClosureDay();
    repository.findById.mockResolvedValue(createFacility());
    repository.findClosureDayById.mockResolvedValue(closureDay);

    await expect(service.removeClosureDay('fac-1', 'closure-1')).resolves.toEqual({
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
      status: ActiveStatus.ACTIVE,
    });
    expect(repository.removeClosureDay).toHaveBeenCalledWith(closureDay);
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
    getOperatingHours: jest.fn(),
    previewOperatingHours: jest.fn(),
    updateOperatingHours: jest.fn(),
    getClosureDays: jest.fn(),
    createClosureDay: jest.fn(),
    updateClosureDay: jest.fn(),
    removeClosureDay: jest.fn(),
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
      data: { items: [facility], total: 1, page: 2, limit: 20, totalPages: 1 },
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

  // Vai tro: management list luon tra object phan trang, ke ca khi FE khong gui page.
  it('uses paginated service for super admin when page is omitted', async () => {
    const mockService = createService();
    const paged = { items: [createFacility()], total: 1, page: 1, limit: 20, totalPages: 1 };
    mockService.findAllPaginated.mockResolvedValue(paged);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(superAdmin, {} as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
      data: paged,
    });
    expect(mockService.findAllPaginated).toHaveBeenCalledWith({});
    expect(mockService.findAll).not.toHaveBeenCalled();
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
      message: RESPONSE_MESSAGES.FACILITIES.CREATED,
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
      message: RESPONSE_MESSAGES.FACILITIES.DELETED,
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

  // Vai tro: dam bao API list closure-days check scope va wrap response dung chuan.
  it('wraps get closure days response after facility access check', async () => {
    const mockService = createService();
    const closureDays = [{
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
      status: ActiveStatus.ACTIVE,
    }];
    mockService.getClosureDays.mockResolvedValue(closureDays);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.getClosureDays(facilityAdmin, 'fac-1', { status: ActiveStatus.ACTIVE })).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.GET_LIST_SUCCESS,
      data: closureDays,
    });
    expect(mockService.getClosureDays).toHaveBeenCalledWith('fac-1', { status: ActiveStatus.ACTIVE });
  });

  // Vai tro: API preview operating-hours cho FE xem impacted shifts truoc khi bam luu that.
  it('wraps operating hour preview response after facility access check', async () => {
    const mockService = createService();
    const preview = {
      canUpdate: false,
      summary: { impactedShiftCount: 1 },
      impactedShifts: [{ id: 'shift-1', reason: 'Ca bat dau truoc gio mo cua moi 08:00:00' }],
    };
    mockService.previewOperatingHours.mockResolvedValue(preview);
    const controller = new FacilitiesController(mockService as any);
    const dto = {
      schedules: [
        { days: ['MON'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    };

    await expect(controller.previewOperatingHours(facilityAdmin, 'fac-1', dto)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES.OPERATING_HOURS_PREVIEW_SUCCESS,
      data: preview,
    });
    expect(mockService.previewOperatingHours).toHaveBeenCalledWith('fac-1', dto);
  });

  // Vai tro: dam bao API tao closure-day khong cho admin co so nay tao ngay nghi cho co so khac.
  it('denies create closure day when user tries to access another facility', async () => {
    const mockService = createService();
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.createClosureDay(facilityAdmin, 'fac-2', {
      closureDate: '2026-09-02',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockService.createClosureDay).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao API update closure-day truyen dung facilityId, closureDayId va body xuong service.
  it('wraps update closure day response', async () => {
    const mockService = createService();
    const updated = {
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
      status: ActiveStatus.INACTIVE,
    };
    mockService.updateClosureDay.mockResolvedValue(updated);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.updateClosureDay(facilityAdmin, 'fac-1', 'closure-1', {
      status: ActiveStatus.INACTIVE,
    })).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.UPDATED,
      data: updated,
    });
    expect(mockService.updateClosureDay).toHaveBeenCalledWith('fac-1', 'closure-1', {
      status: ActiveStatus.INACTIVE,
    });
  });

  // Vai tro: dam bao API xoa closure-day tra lai record vua xoa de FE co the cap nhat UI ro rang.
  it('wraps remove closure day response', async () => {
    const mockService = createService();
    const removed = {
      id: 'closure-1',
      facilityId: 'fac-1',
      closureDate: '2026-09-02',
      reason: 'Nghi le Quoc khanh',
      status: ActiveStatus.ACTIVE,
    };
    mockService.removeClosureDay.mockResolvedValue(removed);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.removeClosureDay(facilityAdmin, 'fac-1', 'closure-1')).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITY_CLOSURE_DAYS.DELETED,
      data: removed,
    });
    expect(mockService.removeClosureDay).toHaveBeenCalledWith('fac-1', 'closure-1');
  });

  // Vai tro: dam bao loi bat ngo o controller duoc chuan hoa thanh InternalServerErrorException.
  it('converts unknown controller errors to internal server error', async () => {
    const mockService = createService();
    mockService.findAllPaginated.mockRejectedValue(new Error('unexpected'));
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(superAdmin, {} as any)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
