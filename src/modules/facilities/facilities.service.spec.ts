import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FacilityOperatingStatus, FacilityStatus, InactiveSource } from '../../common/constants/status.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { FacilityOperatingHoursService } from './facility-operating-hours.service';
import { PublicFacilitiesController } from './public.facilities.controller';
import { Facility } from './entities/facility.entity';
import { OperatingHoursSlotStrategy } from './dto/requests/apply-facility-operating-hours.dto';

const createFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-1',
  owner: null,
  name: 'Main Clinic',
  code: 'FAC-001',
  ownerId: 'staff-1',
  phone: '0900000000',
  email: 'clinic@example.com',
  address: '123 Nguyen Trai',
  province: 'Ho Chi Minh',
  ward: 'Ben Nghe',
  floorCount: 1,
  latitude: '10.7756000',
  longitude: '106.6871000',
  status: FacilityStatus.ACTIVE,
  inactiveFrom: null,
  inactiveUntil: null,
  inactiveReason: null,
  inactiveSource: null,
  inactiveBy: null,
  reactivatedAt: null,
  reactivatedBy: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  facilityServices: [],
  appointments: [],
  ...overrides,
});

describe('FacilitiesService', () => {
  const createRepository = () => ({
    create: jest.fn((dto) => ({ id: 'draft', ...dto })),
    save: jest.fn(async (facility) => ({ ...facility, id: facility.id === 'draft' ? 'fac-1' : facility.id })),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findDetailsById: jest.fn(),
    syncOperatingHours: jest.fn(),
    applyOperatingHours: jest.fn(),
    findOperatingHoursByFacilityId: jest.fn(),
    findActiveShiftsForOperatingHourValidation: jest.fn(),
    findActiveShiftSlotsForOperatingHourValidation: jest.fn(),
    findByCode: jest.fn(),
    findCodesByPrefix: jest.fn(),
    findByName: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findHighestRoomFloor: jest.fn(),
    existsActiveOwner: jest.fn(),
    findAdminOptions: jest.fn(),
    remove: jest.fn(),
    countDependencies: jest.fn(),
    countSuspendImpact: jest.fn(),
    suspendActiveRoomsForFacility: jest.fn(),
    reactivateRoomsSuspendedByFacility: jest.fn(),
    cancelFutureShiftsForFacility: jest.fn(),
    softDelete: jest.fn(),
  });

  let repository: ReturnType<typeof createRepository>;
  let service: FacilitiesService;
  let operatingHoursService: FacilityOperatingHoursService;
  let appointmentDisruptions: { dispatchBySource: jest.Mock };

  beforeEach(() => {
    repository = createRepository();
    repository.findById.mockResolvedValue(createFacility());
    repository.findDetailsById.mockResolvedValue(createFacility());
    repository.findByCode.mockResolvedValue(null);
    repository.findCodesByPrefix.mockResolvedValue([]);
    repository.findByName.mockResolvedValue(null);
    repository.findByEmail.mockResolvedValue(null);
    repository.findByPhone.mockResolvedValue(null);
    repository.findHighestRoomFloor.mockResolvedValue(0);
    repository.syncOperatingHours.mockResolvedValue(undefined);
    repository.applyOperatingHours.mockResolvedValue(0);
    repository.findOperatingHoursByFacilityId.mockResolvedValue([]);
    repository.findActiveShiftsForOperatingHourValidation.mockResolvedValue([]);
    repository.findActiveShiftSlotsForOperatingHourValidation.mockResolvedValue([]);
    repository.existsActiveOwner.mockResolvedValue(true);
    repository.countSuspendImpact.mockResolvedValue({ affectedRooms: 2, affectedShifts: 3, affectedAppointments: 1 });
    repository.suspendActiveRoomsForFacility.mockResolvedValue(2);
    repository.reactivateRoomsSuspendedByFacility.mockResolvedValue(2);
    repository.cancelFutureShiftsForFacility.mockResolvedValue(3);
    operatingHoursService = new FacilityOperatingHoursService(repository as any, repository as any);
    appointmentDisruptions = { dispatchBySource: jest.fn().mockResolvedValue(undefined) };
    service = new FacilitiesService(
      repository as any,
      repository as any,
      operatingHoursService,
      appointmentDisruptions as any,
    );
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

    await expect(service.applyOperatingHours('fac-1', {
      schedules: [
        { days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as any, openTime: '07:00:00', closeTime: '19:00:00', isClosed: false },
        { days: ['SAT'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
        { days: ['SUN'] as any, isClosed: true },
      ],
    })).resolves.toMatchObject({
      operatingHours: expect.any(Array),
      operatingHourGroups: [
        expect.objectContaining({ dayLabel: 'Thứ 2 - Thứ 6', displayTime: '07:00 - 19:00' }),
        expect.objectContaining({ dayLabel: 'Thứ 7', displayTime: '08:00 - 17:00' }),
        expect.objectContaining({ dayLabel: 'Chủ nhật', displayTime: 'Đóng cửa' }),
      ],
    });

    expect(repository.applyOperatingHours).toHaveBeenCalledWith('fac-1', [
      expect.objectContaining({ dayOfWeek: 'MON', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'TUE', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'WED', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'THU', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'FRI', openTime: '07:00:00', closeTime: '19:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'SAT', openTime: '08:00:00', closeTime: '17:00:00', isClosed: false }),
      expect.objectContaining({ dayOfWeek: 'SUN', openTime: null, closeTime: null, isClosed: true }),
    ], []);
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
      await service.applyOperatingHours('fac-1', {
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
    expect(repository.applyOperatingHours).not.toHaveBeenCalled();
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

  // Vai tro: neu gio hoat dong moi lam khung ca active khong dung duoc o mot ngay mo cua thi phai bao ngay khi preview/update.
  it('previews active shift slot impacts when operating hours change', async () => {
    repository.findById.mockResolvedValue(createFacility());
    repository.findOperatingHoursByFacilityId.mockResolvedValue([]);
    repository.findActiveShiftSlotsForOperatingHourValidation.mockResolvedValue([
      {
        id: 'slot-1',
        name: 'Ca sang som',
        code: 'CA_SANG_SOM',
        startTime: '07:55:00',
        endTime: '09:00:00',
        status: 'active',
      },
    ]);

    await expect(service.previewOperatingHours('fac-1', {
      schedules: [
        { days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as any, openTime: '07:00:00', closeTime: '17:00:00', isClosed: false },
        { days: ['SAT'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
        { days: ['SUN'] as any, isClosed: true },
      ],
    })).resolves.toMatchObject({
      canUpdate: false,
      summary: {
        impactedShiftCount: 0,
        impactedShiftSlotCount: 1,
      },
      impactedShiftSlots: [
        expect.objectContaining({
          id: 'slot-1',
          startTime: '07:55:00',
          endTime: '09:00:00',
        }),
      ],
    });
  });

  // Vai tro: strict apply giong update thuong, gap slot mau bi lech gio thi chan luu de FE hien canh bao.
  it('rejects operating hour apply in strict mode when active shift slots become invalid', async () => {
    repository.findById.mockResolvedValue(createFacility());
    repository.findOperatingHoursByFacilityId.mockResolvedValue([]);
    repository.findActiveShiftSlotsForOperatingHourValidation.mockResolvedValue([
      {
        id: 'slot-1',
        name: 'Ca sang som',
        code: 'CA_SANG_SOM',
        startTime: '07:55:00',
        endTime: '09:00:00',
        status: 'active',
      },
    ]);

    await expect(service.applyOperatingHours('fac-1', {
      slotStrategy: OperatingHoursSlotStrategy.STRICT,
      schedules: [
        { days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as any, openTime: '07:00:00', closeTime: '17:00:00', isClosed: false },
        { days: ['SAT'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    })).rejects.toBeInstanceOf(ConflictException);

    expect(repository.applyOperatingHours).not.toHaveBeenCalled();
    expect(repository.syncOperatingHours).not.toHaveBeenCalled();
  });

  // Vai tro: neu chi co slot mau bi lech gio, manager co the chon inactive slot do va luu gio moi trong mot luong.
  it('applies operating hours and deactivates invalid active shift slots when strategy allows it', async () => {
    repository.findById.mockResolvedValue(createFacility());
    repository.findOperatingHoursByFacilityId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { dayOfWeek: 'MON', openTime: '07:00:00', closeTime: '17:00:00', isClosed: false },
        { dayOfWeek: 'SAT', openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ]);
    repository.findActiveShiftSlotsForOperatingHourValidation.mockResolvedValue([
      {
        id: 'slot-1',
        name: 'Ca sang som',
        code: 'CA_SANG_SOM',
        startTime: '07:55:00',
        endTime: '09:00:00',
        status: 'active',
      },
    ]);
    repository.applyOperatingHours.mockResolvedValue(1);

    await expect(service.applyOperatingHours('fac-1', {
      slotStrategy: OperatingHoursSlotStrategy.DEACTIVATE_INVALID_SLOTS,
      schedules: [
        { days: ['MON'] as any, openTime: '07:00:00', closeTime: '17:00:00', isClosed: false },
        { days: ['SAT'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    })).resolves.toMatchObject({
      slotStrategy: OperatingHoursSlotStrategy.DEACTIVATE_INVALID_SLOTS,
      summary: {
        impactedShiftCount: 0,
        impactedShiftSlotCount: 1,
        deactivatedShiftSlotCount: 1,
      },
      impactedShiftSlots: [
        expect.objectContaining({ id: 'slot-1' }),
      ],
    });

    expect(repository.applyOperatingHours).toHaveBeenCalledWith('fac-1', expect.any(Array), ['slot-1']);
    expect(repository.syncOperatingHours).not.toHaveBeenCalled();
  });

  // Vai tro: du co chon inactive slot mau, ca truc that bi anh huong van phai chan vi co the da gan appointment.
  it('rejects operating hour apply with real impacted shifts even when slot strategy deactivates slots', async () => {
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
      },
    ]);

    await expect(service.applyOperatingHours('fac-1', {
      slotStrategy: OperatingHoursSlotStrategy.DEACTIVATE_INVALID_SLOTS,
      schedules: [
        { days: ['MON'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    })).rejects.toBeInstanceOf(ConflictException);

    expect(repository.applyOperatingHours).not.toHaveBeenCalled();
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

    await expect(service.applyOperatingHours('fac-1', {
      schedules: [
        { days: ['MON'] as any, openTime: '07:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    })).resolves.toMatchObject({
      operatingHours: expect.any(Array),
    });
    expect(repository.applyOperatingHours).toHaveBeenCalled();
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

  // Vai tro: detail khong ton tai phai tra 404, khong tra object rong cho FE.
  it('throws not found when facility details do not exist', async () => {
    repository.findDetailsById.mockResolvedValue(null);

    await expect(service.findDetailsById('missing')).rejects.toBeInstanceOf(NotFoundException);
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

  it('rejects reducing floor count below an existing room floor', async () => {
    repository.findById.mockResolvedValue(createFacility({ floorCount: 5 }));
    repository.findHighestRoomFloor.mockResolvedValue(4);

    await expect(service.update('fac-1', { floorCount: 3 }))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
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

  // Vai tro: status chi duoc doi qua suspend/reactivate de khong bo qua xu ly room, shift va appointment.
  it('rejects status changes through the normal update method', async () => {
    await expect(service.update('fac-1', { status: FacilityStatus.INACTIVE } as any))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
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

  it('suspends and reactivates a facility with impact summary', async () => {
    repository.findById.mockResolvedValue(createFacility());
    repository.findDetailsById.mockResolvedValue(createFacility({ status: FacilityStatus.INACTIVE }));

    await expect(service.suspend('fac-1', {
      inactiveUntil: '2099-08-20T17:00:00+07:00',
      reason: 'Bao tri',
    }, 'staff-9')).resolves.toMatchObject({
      impact: { affectedRooms: 2, affectedShifts: 3, affectedAppointments: 1 },
      facility: { status: FacilityStatus.INACTIVE },
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: FacilityStatus.INACTIVE,
      inactiveReason: 'Bao tri',
      inactiveSource: InactiveSource.MANUAL,
      inactiveBy: 'staff-9',
    }));
    expect(repository.suspendActiveRoomsForFacility).toHaveBeenCalledWith(
      'fac-1',
      expect.any(Date),
      expect.any(Date),
      'Bao tri',
      'staff-9',
    );
    expect(repository.cancelFutureShiftsForFacility).toHaveBeenCalledWith(
      'fac-1',
      expect.any(Date),
      expect.any(Date),
      'Bao tri',
      'staff-9',
    );

    repository.findById.mockResolvedValue(createFacility({ status: FacilityStatus.INACTIVE }));
    repository.findDetailsById.mockResolvedValue(createFacility({ status: FacilityStatus.ACTIVE }));
    await expect(service.reactivate('fac-1', 'staff-9')).resolves.toMatchObject({
      facility: { status: FacilityStatus.ACTIVE },
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      status: FacilityStatus.ACTIVE,
      inactiveSource: null,
      reactivatedBy: 'staff-9',
    }));
    expect(repository.reactivateRoomsSuspendedByFacility).toHaveBeenCalledWith('fac-1', 'staff-9');
  });

  // Vai tro: inactiveUntil null nghia la ngung vo thoi han; cac room/shift lien quan cung nhan moc ket thuc null.
  it('suspends a facility indefinitely when inactiveUntil is omitted', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-12T08:00:00.000Z'));
    repository.findDetailsById.mockResolvedValue(createFacility({
      status: FacilityStatus.INACTIVE,
      inactiveUntil: null,
    }));

    await expect(service.suspend('fac-1', { reason: 'Bao tri chua co ngay mo lai' }, 'staff-9'))
      .resolves.toMatchObject({ facility: { status: FacilityStatus.INACTIVE } });

    expect(repository.countSuspendImpact).toHaveBeenCalledWith(
      'fac-1',
      new Date('2026-08-12T08:00:00.000Z'),
      null,
    );
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      inactiveUntil: null,
      inactiveReason: 'Bao tri chua co ngay mo lai',
    }));
    expect(repository.suspendActiveRoomsForFacility).toHaveBeenCalledWith(
      'fac-1',
      new Date('2026-08-12T08:00:00.000Z'),
      null,
      'Bao tri chua co ngay mo lai',
      'staff-9',
    );
    expect(repository.cancelFutureShiftsForFacility).toHaveBeenCalledWith(
      'fac-1',
      new Date('2026-08-12T08:00:00.000Z'),
      null,
      'Bao tri chua co ngay mo lai',
      'staff-9',
    );
    expect(appointmentDisruptions.dispatchBySource).toHaveBeenCalledWith('facility', 'fac-1');
  });

  // Vai tro: chan ngay mo lai sai hoac da qua truoc khi ghi status va tao disruption.
  it.each([
    'invalid-date',
    '2026-08-11T08:00:00.000Z',
    '2026-08-12T08:00:00.000Z',
  ])('rejects invalid or non-future suspension end time %s', async (inactiveUntil) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-12T08:00:00.000Z'));

    await expect(service.suspend('fac-1', { inactiveUntil, reason: 'Bao tri' }, 'staff-9'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.countSuspendImpact).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.suspendActiveRoomsForFacility).not.toHaveBeenCalled();
    expect(repository.cancelFutureShiftsForFacility).not.toHaveBeenCalled();
  });

  // Vai tro: facility het han tam ngung se tu active va chi mo lai room bi facility lam inactive.
  it('automatically reactivates an expired facility and its affected rooms', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-12T08:00:00.000Z'));
    const expired = createFacility({
      status: FacilityStatus.INACTIVE,
      inactiveUntil: new Date('2026-08-12T07:59:59.000Z'),
      inactiveSource: InactiveSource.MANUAL,
    });
    repository.findById.mockResolvedValue(expired);
    repository.save.mockImplementation(async value => value);

    await expect(service.findById('fac-1')).resolves.toMatchObject({
      status: FacilityStatus.ACTIVE,
      inactiveSource: null,
      reactivatedBy: null,
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'fac-1',
      status: FacilityStatus.ACTIVE,
      inactiveSource: null,
    }));
    expect(repository.reactivateRoomsSuspendedByFacility).toHaveBeenCalledWith('fac-1', null);
  });

  // Vai tro: facility inactive chua den han thi van inactive va khong cham vao room.
  it('keeps a suspended facility inactive before inactiveUntil', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-12T08:00:00.000Z'));
    const suspended = createFacility({
      status: FacilityStatus.INACTIVE,
      inactiveUntil: new Date('2026-08-13T08:00:00.000Z'),
    });
    repository.findById.mockResolvedValue(suspended);

    await expect(service.findById('fac-1')).resolves.toBe(suspended);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.reactivateRoomsSuspendedByFacility).not.toHaveBeenCalled();
  });

  // Vai tro: cac lookup nhe cho form quan ly phai delegate dung filter, khong tu sua query.
  it('delegates admin options and operating-hours lookup to their repositories', async () => {
    const adminOptions = { items: [{ id: 'staff-1' }], total: 1 };
    const operatingHours = [{ dayOfWeek: 'MON', openTime: '07:00:00', closeTime: '17:00:00' }];
    repository.findAdminOptions.mockResolvedValue(adminOptions);
    repository.findOperatingHoursByFacilityId.mockResolvedValue(operatingHours);

    await expect(service.findAdminOptions({ search: 'admin' } as any)).resolves.toBe(adminOptions);
    await expect(service.getOperatingHours('fac-1')).resolves.toMatchObject({ operatingHours });
    expect(repository.findAdminOptions).toHaveBeenCalledWith({ search: 'admin' });
    expect(repository.findOperatingHoursByFacilityId).toHaveBeenCalledWith('fac-1');
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
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findDetailsById: jest.fn(),
    getOperatingHours: jest.fn(),
    previewOperatingHours: jest.fn(),
    applyOperatingHours: jest.fn(),
    findAdminOptions: jest.fn(),
    update: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    remove: jest.fn(),
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

  // Vai tro: controller luon tra response phan trang de FE khong phai xu ly hai shape khac nhau.
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

  // Vai tro: detail va update phai kiem tra scope facility roi giu response wrapper thong nhat cho FE.
  it('wraps facility detail and update responses inside the allowed scope', async () => {
    const mockService = createService();
    const facility = createFacility();
    const updated = createFacility({ address: '456 Le Loi' });
    mockService.findDetailsById.mockResolvedValue(facility);
    mockService.update.mockResolvedValue(updated);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findOne(facilityAdmin, 'fac-1')).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES.GET_SUCCESS,
      data: facility,
    });
    await expect(controller.update(facilityAdmin, 'fac-1', { address: '456 Le Loi' }))
      .resolves.toEqual({
        message: RESPONSE_MESSAGES.FACILITIES.UPDATED,
        data: updated,
      });
    expect(mockService.update).toHaveBeenCalledWith('fac-1', { address: '456 Le Loi' });
  });

  // Vai tro: API owner options chi boc ket qua service, khong lam mat metadata phan trang.
  it('wraps facility admin options response', async () => {
    const mockService = createService();
    const options = { items: [{ id: 'staff-1', fullName: 'Admin A' }], total: 1 };
    mockService.findAdminOptions.mockResolvedValue(options);
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAdminOptions({ search: 'Admin' } as any)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES.ADMIN_OPTIONS_SUCCESS,
      data: options,
    });
  });

  // Vai tro: suspend/reactivate phai truyen actor id de audit va chi thao tac trong facility scope duoc phep.
  it('wraps suspend and reactivate responses with the current actor', async () => {
    const mockService = createService();
    const suspended = {
      facility: createFacility({ status: FacilityStatus.INACTIVE }),
      impact: { affectedRooms: 2, affectedShifts: 3 },
    };
    const reactivated = {
      facility: createFacility({ status: FacilityStatus.ACTIVE }),
      impact: { reactivatedRooms: 2 },
    };
    mockService.suspend.mockResolvedValue(suspended);
    mockService.reactivate.mockResolvedValue(reactivated);
    const controller = new FacilitiesController(mockService as any);
    const dto = { inactiveUntil: null, reason: 'Bao tri' };

    await expect(controller.suspend(facilityAdmin, 'fac-1', dto)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES.STATUS_UPDATED,
      data: suspended,
    });
    await expect(controller.reactivate(facilityAdmin, 'fac-1')).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES.STATUS_UPDATED,
      data: reactivated,
    });
    expect(mockService.suspend).toHaveBeenCalledWith('fac-1', dto, 'user-admin');
    expect(mockService.reactivate).toHaveBeenCalledWith('fac-1', 'user-admin');
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

  // Vai tro: API apply cho phep FE gui strategy xu ly slot mau khi luu gio hoat dong.
  it('wraps operating hour apply response after facility access check', async () => {
    const mockService = createService();
    const result = {
      slotStrategy: OperatingHoursSlotStrategy.DEACTIVATE_INVALID_SLOTS,
      summary: { impactedShiftCount: 0, impactedShiftSlotCount: 1, deactivatedShiftSlotCount: 1 },
    };
    mockService.applyOperatingHours.mockResolvedValue(result);
    const controller = new FacilitiesController(mockService as any);
    const dto = {
      slotStrategy: OperatingHoursSlotStrategy.DEACTIVATE_INVALID_SLOTS,
      schedules: [
        { days: ['SAT'] as any, openTime: '08:00:00', closeTime: '17:00:00', isClosed: false },
      ],
    };

    await expect(controller.applyOperatingHours(facilityAdmin, 'fac-1', dto)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES.OPERATING_HOURS_UPDATED,
      data: result,
    });
    expect(mockService.applyOperatingHours).toHaveBeenCalledWith('fac-1', dto);
  });

  // Vai tro: dam bao loi bat ngo o controller duoc chuan hoa thanh InternalServerErrorException.
  it('converts unknown controller errors to internal server error', async () => {
    const mockService = createService();
    mockService.findAllPaginated.mockRejectedValue(new Error('unexpected'));
    const controller = new FacilitiesController(mockService as any);

    await expect(controller.findAll(superAdmin, {} as any)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe('PublicFacilitiesController', () => {
  const createService = () => ({
    findAllPaginated: jest.fn(),
    findDetailsById: jest.fn(),
  });

  it('returns paginated active facilities for public list', async () => {
    const service = createService();
    const paged = { items: [createFacility()], total: 1, page: 1, limit: 20, totalPages: 1 };
    service.findAllPaginated.mockResolvedValue(paged);
    const controller = new PublicFacilitiesController(service as any);
    const query = {} as any;

    await expect(controller.findAll(query)).resolves.toEqual({
      message: RESPONSE_MESSAGES.FACILITIES.GET_LIST_SUCCESS,
      data: paged,
    });
    expect(query.status).toBe(FacilityStatus.ACTIVE);
    expect(service.findAllPaginated).toHaveBeenCalledWith(query);
  });

});
