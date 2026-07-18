import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActiveStatus, DoctorShiftStatus, FacilityStatus } from '../../common/constants/status.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { BulkCreateDoctorShiftDto, ShiftWorkingDay } from './dto/requests/bulk-create-doctor-shift.dto';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { CopyWeekDoctorShiftDto } from './dto/requests/copy-week-doctor-shift.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { DoctorAvailabilityQueryDto } from './dto/requests/doctor-availability.dto';
import { SearchDoctorShiftDto, WeeklyDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import {
  buildShiftDates,
  dateTimeToTime,
  minutesToTime,
  timesOverlap,
  timeToMinutes,
} from './helpers/doctor-shifts.helper';
import { DoctorShiftsController } from './doctor-shifts.controller';
import { DoctorShiftsRepository } from './repositories/doctor-shifts.repository';
import { DoctorShiftsService } from './doctor-shifts.service';
import { DoctorShiftsValidator } from './validators/doctor-shifts.validator';

// describe: dùng để nhóm các test case liên quan đến một chức năng hoặc module cụ thể,
//  giúp tổ chức và quản lý các test case dễ dàng hơn. Trong ví dụ này, 
// describe được sử dụng để nhóm các test case liên quan đến việc kiểm tra tính hợp lệ của các DTO trong module DoctorShifts 
// và các validation nghiệp vụ của DoctorShiftsService.

//it: đại diện cho một test case cụ thể, mô tả một hành vi hoặc kết quả mong đợi của chức năng được kiểm tra.

//mô tả 1: Kiểm tra tính hợp lệ của các DTO trong module DoctorShifts
describe('DoctorShifts DTO validation', () => {
  const validPayload = {
    doctorId: '1', facilityId: '1', roomId: '2', shiftDate: '2099-07-07',
    startTime: '08:00', endTime: '12:00', maxAppointments: 10,
    status: DoctorShiftStatus.AVAILABLE,
  };

  //test1: kiểm tra xem DTO CreateDoctorShiftDto có chấp nhận một payload hợp lệ và chuyển đổi 
  // maxAppointments từ chuỗi sang số nguyên hay không.
  it('accepts a valid create payload and transforms maxAppointments', async () => {
    const dto = plainToInstance(CreateDoctorShiftDto, { ...validPayload, maxAppointments: '10' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.maxAppointments).toBe(10);
  });

  //test2: kiểm tra xem DTO CreateDoctorShiftDto có từ chối các payload không hợp lệ và xác định đúng
  // thuộc tính bị lỗi hay không. Sử dụng it.each để chạy nhiều trường hợp kiểm tra với các payload khác nhau.
  it.each([
    [{ ...validPayload, doctorId: '0' }, 'doctorId'],
    [{ ...validPayload, shiftDate: '07/07/2099' }, 'shiftDate'],
    [{ ...validPayload, startTime: '25:00' }, 'startTime'],
    [{ ...validPayload, endTime: '07:00' }, 'endTime'],
    [{ ...validPayload, maxAppointments: 101 }, 'maxAppointments'],
    [{ ...validPayload, status: DoctorShiftStatus.FULL }, 'status'],
  ])('rejects invalid create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateDoctorShiftDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  //test3: kiểm tra xem DTO UpdateDoctorShiftDto có cho phép cập nhật trạng thái là cancelled hoặc full hay không.
  it('allows cancelled/full status on update', async () => {
    expect(await validate(plainToInstance(UpdateDoctorShiftDto, {
      status: DoctorShiftStatus.CANCELLED,
    }))).toHaveLength(0);
    expect(await validate(plainToInstance(UpdateDoctorShiftDto, {
      status: DoctorShiftStatus.FULL,
    }))).toHaveLength(0);
  });

  it('validates search pagination and date inputs', async () => {
    const dto = plainToInstance(SearchDoctorShiftDto, {
      facilityId: '-1', dateFrom: 'invalid', page: '0', limit: '101',
    });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['facilityId', 'dateFrom', 'page', 'limit']),
    );
  });

  it('validates bulk-create payload', async () => {
    const dto = plainToInstance(BulkCreateDoctorShiftDto, {
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      fromDate: '2099-07-06',
      toDate: '2099-07-20',
      workingDays: [ShiftWorkingDay.MON, ShiftWorkingDay.WED],
      startTime: '08:00',
      endTime: '12:00',
      maxAppointments: '8',
      status: DoctorShiftStatus.AVAILABLE,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.maxAppointments).toBe(8);
  });

  it('validates copy-week and doctor availability payloads', async () => {
    expect(await validate(plainToInstance(CopyWeekDoctorShiftDto, {
      facilityId: '1',
      sourceWeekStart: '2099-07-06',
      targetWeekStart: '2099-07-13',
    }))).toHaveLength(0);
    expect(await validate(plainToInstance(DoctorAvailabilityQueryDto, {
      facilityId: '1',
      date: '2099-07-13',
      slotMinutes: '30',
    }))).toHaveLength(0);
  });

  it.each([
    [[], 'empty workingDays'],
    [[ShiftWorkingDay.MON, ShiftWorkingDay.MON], 'duplicate workingDays'],
    [['XXX'], 'invalid workingDays enum'],
  ])('TC-UNIT-DSHIFT-056 rejects %s in bulk-create payload', async (workingDays) => {
    const dto = plainToInstance(BulkCreateDoctorShiftDto, {
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      fromDate: '2099-07-06',
      toDate: '2099-07-20',
      workingDays,
      startTime: '08:00',
      endTime: '12:00',
      maxAppointments: 8,
      status: DoctorShiftStatus.AVAILABLE,
    });

    const errors = await validate(dto);
    expect(errors.some(error => error.property === 'workingDays')).toBe(true);
  });

  it.each([14, 241])('TC-UNIT-DSHIFT-057 rejects slotMinutes boundary %s', async (slotMinutes) => {
    const dto = plainToInstance(DoctorAvailabilityQueryDto, {
      facilityId: '1',
      date: '2099-07-13',
      slotMinutes,
    });

    const errors = await validate(dto);
    expect(errors.some(error => error.property === 'slotMinutes')).toBe(true);
  });

  it('accepts a valid conflict-check payload with excludeShiftId', async () => {
    const dto = plainToInstance(CheckShiftConflictDto, {
      ...validPayload,
      excludeShiftId: '10',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it.each(['0', '-1', 'abc'])('rejects invalid conflict-check excludeShiftId %s', async (excludeShiftId) => {
    const dto = plainToInstance(CheckShiftConflictDto, {
      ...validPayload,
      excludeShiftId,
    });

    const errors = await validate(dto);
    expect(errors.some(error => error.property === 'excludeShiftId')).toBe(true);
  });

  it('accepts a valid weekly schedule query', async () => {
    const dto = plainToInstance(WeeklyDoctorShiftDto, {
      facilityId: '1',
      doctorId: '2',
      weekStart: '2099-07-06',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects invalid weekly schedule query inputs', async () => {
    const dto = plainToInstance(WeeklyDoctorShiftDto, {
      facilityId: '0',
      doctorId: 'abc',
      weekStart: '07/06/2099',
    });

    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['facilityId', 'doctorId', 'weekStart']),
    );
  });
});


//mô tả 2: Kiểm tra các validation nghiệp vụ của DoctorShiftsService
describe('DoctorShiftsService business validation', () => {
  const facility = { id: '1', status: FacilityStatus.ACTIVE };
  const room = { id: '2', facilityId: '1', status: ActiveStatus.ACTIVE };
  const shift = {
    id: '10', doctorId: '1', facilityId: '1', roomId: '2',
    shiftDate: '2099-07-07', startTime: '08:00', endTime: '12:00',
    maxAppointments: 10, status: DoctorShiftStatus.AVAILABLE,
  };
  const createRepo = () => ({
    create: jest.fn(data => ({ ...data })),
    save: jest.fn(async data => ({ ...data, id: data.id ?? '10' })),
    remove: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue({ ...shift }),
    findAll: jest.fn().mockResolvedValue([{ ...shift }]),
    findAllPaginated: jest.fn().mockResolvedValue({ items: [{ ...shift }], total: 1, page: 1, limit: 20 }),
    findDetailsById: jest.fn().mockResolvedValue({ ...shift }),
    findConflicts: jest.fn().mockResolvedValue({ doctorConflicts: [], roomConflicts: [] }),
    findWeekly: jest.fn().mockResolvedValue([{ ...shift }]),
    findWeeklyWithDetails: jest.fn().mockResolvedValue([{ ...shift }]),
    findDoctorShiftsForDate: jest.fn().mockResolvedValue([{ ...shift }]),
    findDoctorAppointmentsForDate: jest.fn().mockResolvedValue([]),
    findAppointmentsForShift: jest.fn().mockResolvedValue([]),
    cancelShiftWithDisruption: jest.fn().mockResolvedValue({ shift: { ...shift, status: DoctorShiftStatus.CANCELLED }, disruptionId: '77' }),
    isDoctorAssignedToFacility: jest.fn().mockResolvedValue(true),
    insertMonthlyShifts: jest.fn(),
    saveMany: jest.fn(async (items: Record<string, unknown>[]) => items.map((item, index: number) => ({
      ...item,
      id: String(index + 1),
    }))),
  });
  const facilitiesService = { findById: jest.fn().mockResolvedValue(facility) };
  const roomsService = { findById: jest.fn().mockResolvedValue(room) };
  const createService = (repo = createRepo()) => ({
    repo,
    service: new DoctorShiftsService(
      repo as never,
      new DoctorShiftsValidator(repo as never, facilitiesService as never, roomsService as never),
    ),
  });

  beforeEach(() => jest.clearAllMocks());

  it('creates a shift after validating references and conflicts', async () => {
    const { repo, service } = createService();
    await expect(service.create({ ...shift, id: undefined } as never)).resolves.toMatchObject({ id: '10' });
    expect(repo.isDoctorAssignedToFacility).toHaveBeenCalledWith('1', '1');
    expect(repo.findConflicts).toHaveBeenCalled();
  });

  it('treats HH:mm shift time as equal to HH:mm:ss facility opening time', async () => {
    facilitiesService.findById.mockResolvedValueOnce({
      ...facility,
      open_time: '07:00:00',
      close_time: '17:00:00',
    });
    const { service } = createService();
    await expect(service.create({
      ...shift,
      startTime: '07:00',
      endTime: '12:00',
    } as never)).resolves.toMatchObject({ startTime: '07:00' });
  });

  it('rejects an inactive facility or an unassigned doctor', async () => {
    facilitiesService.findById.mockResolvedValueOnce({ ...facility, status: FacilityStatus.INACTIVE });
    await expect(createService().service.create(shift as never)).rejects.toBeInstanceOf(ConflictException);
    const context = createService();
    context.repo.isDoctorAssignedToFacility.mockResolvedValue(false);
    await expect(context.service.create(shift as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a room from another facility and off shift with a room', async () => {
    roomsService.findById.mockResolvedValueOnce({ ...room, facilityId: '2' });
    await expect(createService().service.create(shift as never)).rejects.toBeInstanceOf(ConflictException);
    await expect(createService().service.create({
      ...shift, status: DoctorShiftStatus.OFF,
    } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid duration and doctor/room conflicts', async () => {
    await expect(createService().service.create({
      ...shift, startTime: '08:00', endTime: '08:10',
    } as never)).rejects.toBeInstanceOf(BadRequestException);
    const doctorContext = createService();
    doctorContext.repo.findConflicts.mockResolvedValue({ doctorConflicts: [shift], roomConflicts: [] });
    await expect(doctorContext.service.create(shift as never)).rejects.toBeInstanceOf(ConflictException);
    const roomContext = createService();
    roomContext.repo.findConflicts.mockResolvedValue({ doctorConflicts: [], roomConflicts: [shift] });
    await expect(roomContext.service.create(shift as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('excludes the current shift when checking an update', async () => {
    const { repo, service } = createService();
    await service.update('10', { startTime: '09:00', endTime: '12:00' });
    expect(repo.findConflicts).toHaveBeenCalledWith(expect.objectContaining({ excludeShiftId: '10' }));
  });

  it('returns conflict details without throwing from the pre-check API', async () => {
    const { repo, service } = createService();
    repo.findConflicts.mockResolvedValue({ doctorConflicts: [shift], roomConflicts: [] });
    const result = await service.checkConflicts(plainToInstance(CheckShiftConflictDto, shift));
    expect(result).toMatchObject({ hasConflict: true, doctorConflicts: [shift] });
  });

  it('returns seven grouped days for the weekly calendar', async () => {
    const { repo, service } = createService();
    const result = await service.getWeeklySchedule('1', '2099-07-06', '1');
    expect(result.weekEnd).toBe('2099-07-12');
    expect(result.days).toHaveLength(7);
    expect(repo.findWeeklyWithDetails).toHaveBeenCalledWith('1', '2099-07-06', '2099-07-12', '1');
  });

  it('bulk creates shifts only on selected working days', async () => {
    const { repo, service } = createService();
    const result = await service.bulkCreate({
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      fromDate: '2099-07-06',
      toDate: '2099-07-10',
      workingDays: [ShiftWorkingDay.MON, ShiftWorkingDay.WED],
      startTime: '08:00',
      endTime: '12:00',
      maxAppointments: 8,
      status: DoctorShiftStatus.AVAILABLE,
    });
    expect(result).toHaveLength(2);
    expect(repo.saveMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ shiftDate: '2099-07-06' }),
      expect.objectContaining({ shiftDate: '2099-07-08' }),
    ]));
  });

  it('copies a week, skips cancelled shifts, and resets full shifts to available', async () => {
    const { repo, service } = createService();
    repo.findWeekly.mockResolvedValueOnce([
      { ...shift, id: '1', shiftDate: '2099-07-06', status: DoctorShiftStatus.FULL },
      { ...shift, id: '2', shiftDate: '2099-07-07', status: DoctorShiftStatus.CANCELLED },
    ]);
    const result = await service.copyWeek({
      facilityId: '1',
      sourceWeekStart: '2099-07-06',
      targetWeekStart: '2099-07-13',
    });
    expect(result).toHaveLength(1);
    expect(repo.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({
        shiftDate: '2099-07-13',
        status: DoctorShiftStatus.AVAILABLE,
      }),
    ]);
  });

  it('returns doctor availability slots excluding booked appointments', async () => {
    const { repo, service } = createService();
    repo.findDoctorShiftsForDate.mockResolvedValueOnce([{
      ...shift,
      startTime: '08:00:00',
      endTime: '09:00:00',
      maxAppointments: 10,
    }]);
    repo.findDoctorAppointmentsForDate.mockResolvedValueOnce([{
      id: '99',
      scheduledStart: '2099-07-07T08:00:00',
      scheduledEnd: '2099-07-07T08:30:00',
      status: 'booked',
    }]);
    const result = await service.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
      slotMinutes: 30,
    });
    expect(result.shifts[0].availableSlots).toEqual([
      { startTime: '08:30:00', endTime: '09:00:00' },
    ]);
  });

  it('TC-UNIT-DSHIFT-007 rejects shifts longer than 12 hours', async () => {
    await expect(createService().service.create({
      ...shift,
      startTime: '07:00',
      endTime: '20:01',
    } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-008 rejects shifts in the past', async () => {
    await expect(createService().service.create({
      ...shift,
      shiftDate: '2000-01-01',
    } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-009 rejects shifts outside facility opening hours', async () => {
    facilitiesService.findById.mockResolvedValueOnce({
      ...facility,
      open_time: '08:00:00',
      close_time: '17:00:00',
    });

    await expect(createService().service.create({
      ...shift,
      startTime: '07:30',
      endTime: '12:00',
    } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-014 rejects list and bulk-create when date range is reversed', async () => {
    const { repo, service } = createService();

    await expect(service.findAll({ dateFrom: '2099-07-20', dateTo: '2099-07-01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.findAll).not.toHaveBeenCalled();
    await expect(service.bulkCreate({
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      fromDate: '2099-07-20',
      toDate: '2099-07-01',
      workingDays: [ShiftWorkingDay.MON],
      startTime: '08:00',
      endTime: '12:00',
      status: DoctorShiftStatus.AVAILABLE,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-015 rejects bulk-create when no date matches workingDays', async () => {
    await expect(createService().service.bulkCreate({
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      fromDate: '2099-07-06',
      toDate: '2099-07-06',
      workingDays: [ShiftWorkingDay.SUN],
      startTime: '08:00',
      endTime: '12:00',
      status: DoctorShiftStatus.AVAILABLE,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-016 rejects bulk-create ranges longer than 92 days', async () => {
    await expect(createService().service.bulkCreate({
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      fromDate: '2099-01-01',
      toDate: '2099-04-05',
      workingDays: [ShiftWorkingDay.MON],
      startTime: '08:00',
      endTime: '12:00',
      status: DoctorShiftStatus.AVAILABLE,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-017 does not save bulk payloads when one generated shift conflicts', async () => {
    const { repo, service } = createService();
    repo.findConflicts
      .mockResolvedValueOnce({ doctorConflicts: [], roomConflicts: [] })
      .mockResolvedValueOnce({ doctorConflicts: [shift], roomConflicts: [] });

    await expect(service.bulkCreate({
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      fromDate: '2099-07-06',
      toDate: '2099-07-08',
      workingDays: [ShiftWorkingDay.MON, ShiftWorkingDay.WED],
      startTime: '08:00',
      endTime: '12:00',
      status: DoctorShiftStatus.AVAILABLE,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(repo.saveMany).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-018 returns list results when date range is valid', async () => {
    const { repo, service } = createService();

    await expect(service.findAll({ dateFrom: '2099-07-01', dateTo: '2099-07-31' })).resolves.toEqual([{ ...shift }]);
    expect(repo.findAll).toHaveBeenCalledWith({ dateFrom: '2099-07-01', dateTo: '2099-07-31' });
  });

  it('TC-UNIT-DSHIFT-020 returns paginated results when date range is valid', async () => {
    const { repo, service } = createService();

    await expect(service.findAllPaginated({ page: 1, limit: 20 })).resolves.toMatchObject({ total: 1 });
    expect(repo.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('returns not found when list or paginated list has no shifts', async () => {
    const listContext = createService();
    listContext.repo.findAll.mockResolvedValueOnce([]);
    await expect(listContext.service.findAll({ facilityId: '1' })).rejects.toBeInstanceOf(NotFoundException);

    const pagedContext = createService();
    pagedContext.repo.findAllPaginated.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    await expect(pagedContext.service.findAllPaginated({ page: 1, limit: 20 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('TC-UNIT-DSHIFT-021 returns a shift by valid id', async () => {
    const { repo, service } = createService();

    await expect(service.findById('10')).resolves.toMatchObject({ id: '10' });
    expect(repo.findById).toHaveBeenCalledWith('10');
  });

  it('TC-UNIT-DSHIFT-022 rejects invalid path ids before querying repository', async () => {
    const { repo, service } = createService();

    await expect(service.findById('abc')).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-023 returns not found when a valid shift id does not exist', async () => {
    const { repo, service } = createService();
    repo.findById.mockResolvedValueOnce(null);

    await expect(service.findById('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('TC-UNIT-DSHIFT-025 skips conflict check when updating a shift to cancelled', async () => {
    const { repo, service } = createService();

    await service.update('10', { status: DoctorShiftStatus.CANCELLED });

    expect(repo.findConflicts).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: DoctorShiftStatus.CANCELLED }));
  });

  it('TC-UNIT-DSHIFT-026 rejects update when target room is inactive', async () => {
    roomsService.findById.mockResolvedValueOnce({ ...room, status: ActiveStatus.INACTIVE });

    await expect(createService().service.update('10', { roomId: '2' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('TC-UNIT-DSHIFT-027 hard deletes a shift without related appointments', async () => {
    const { repo, service } = createService();

    await expect(service.remove('10', 'cleanup', '99')).resolves.toEqual({
      action: 'hard_deleted',
      affectedCount: 0,
    });
    expect(repo.findAppointmentsForShift).toHaveBeenCalledWith(expect.objectContaining({ id: '10' }));
    expect(repo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: '10' }));
    expect(repo.cancelShiftWithDisruption).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-028 cancels a shift with active affected appointments', async () => {
    const { repo, service } = createService();
    const relatedAppointment = {
      id: 'a1',
      scheduledStart: new Date('2099-07-07T08:00:00'),
      scheduledEnd: new Date('2099-07-07T08:30:00'),
      status: 'booked',
    };
    repo.findAppointmentsForShift
      .mockResolvedValueOnce([relatedAppointment])
      .mockResolvedValueOnce([relatedAppointment, { ...relatedAppointment, id: 'a2' }]);

    await expect(service.remove('10', 'doctor unavailable', '99')).resolves.toEqual({
      action: 'cancelled',
      affectedCount: 2,
      disruptionId: '77',
    });
    expect(repo.cancelShiftWithDisruption).toHaveBeenCalledWith(
      expect.objectContaining({ id: '10' }),
      expect.arrayContaining([expect.objectContaining({ id: 'a1' })]),
      'doctor unavailable',
      '99',
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-029 cancels a shift with zero active affected appointments when historical appointments exist', async () => {
    const { repo, service } = createService();
    repo.findAppointmentsForShift
      .mockResolvedValueOnce([{
        id: 'done',
        scheduledStart: new Date('2099-07-07T08:00:00'),
        scheduledEnd: new Date('2099-07-07T08:30:00'),
        status: 'completed',
      }])
      .mockResolvedValueOnce([]);

    await expect(service.remove('10')).resolves.toEqual({
      action: 'cancelled',
      affectedCount: 0,
      disruptionId: '77',
    });
    expect(repo.cancelShiftWithDisruption).toHaveBeenCalledWith(expect.any(Object), [], undefined, undefined);
  });

  it('TC-UNIT-DSHIFT-030 returns hasConflict=false when pre-check arrays are empty', async () => {
    const { service } = createService();

    await expect(service.checkConflicts(plainToInstance(CheckShiftConflictDto, shift))).resolves.toMatchObject({
      hasConflict: false,
      doctorConflicts: [],
      roomConflicts: [],
    });
  });

  it('TC-UNIT-DSHIFT-033 rejects copying a week onto itself', async () => {
    await expect(createService().service.copyWeek({
      facilityId: '1',
      sourceWeekStart: '2099-07-06',
      targetWeekStart: '2099-07-06',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-034 returns empty array when source week has only cancelled shifts', async () => {
    const { repo, service } = createService();
    repo.findWeekly.mockResolvedValueOnce([{ ...shift, status: DoctorShiftStatus.CANCELLED }]);

    await expect(service.copyWeek({
      facilityId: '1',
      sourceWeekStart: '2099-07-06',
      targetWeekStart: '2099-07-13',
    })).resolves.toEqual([]);
    expect(repo.saveMany).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-035 does not save copied shifts when target validation conflicts', async () => {
    const { repo, service } = createService();
    repo.findWeekly.mockResolvedValueOnce([{ ...shift, shiftDate: '2099-07-06' }]);
    repo.findConflicts.mockResolvedValueOnce({ doctorConflicts: [shift], roomConflicts: [] });

    await expect(service.copyWeek({
      facilityId: '1',
      sourceWeekStart: '2099-07-06',
      targetWeekStart: '2099-07-13',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(repo.saveMany).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-037 defaults doctor availability slotMinutes to 60', async () => {
    const { repo, service } = createService();
    repo.findDoctorShiftsForDate.mockResolvedValueOnce([{
      ...shift,
      startTime: '08:00:00',
      endTime: '10:00:00',
      maxAppointments: 10,
    }]);

    const result = await service.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
    });

    expect(result.slotMinutes).toBe(60);
    expect(result.shifts[0].availableSlots).toEqual([
      { startTime: '08:00:00', endTime: '09:00:00' },
      { startTime: '09:00:00', endTime: '10:00:00' },
    ]);
  });

  it('TC-UNIT-DSHIFT-038 does not generate slots for full or fully booked shifts', async () => {
    const { repo, service } = createService();
    repo.findDoctorShiftsForDate.mockResolvedValueOnce([
      { ...shift, id: 'full', startTime: '08:00:00', endTime: '09:00:00', status: DoctorShiftStatus.FULL, maxAppointments: 10 },
      { ...shift, id: 'limited', startTime: '09:00:00', endTime: '10:00:00', maxAppointments: 1 },
    ]);
    repo.findDoctorAppointmentsForDate.mockResolvedValueOnce([{
      id: 'a1',
      scheduledStart: new Date('2099-07-07T09:00:00'),
      scheduledEnd: new Date('2099-07-07T09:30:00'),
      status: 'booked',
    }]);

    const result = await service.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
      slotMinutes: 30,
    });

    expect(result.shifts).toEqual([
      expect.objectContaining({ shiftId: 'full', availableSlots: [] }),
      expect.objectContaining({ shiftId: 'limited', bookedAppointments: 1, availableSlots: [] }),
    ]);
  });

  it('TC-UNIT-DSHIFT-039 rejects doctor availability for an unassigned doctor', async () => {
    const { repo, service } = createService();
    repo.isDoctorAssignedToFacility.mockResolvedValueOnce(false);

    await expect(service.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(repo.findDoctorShiftsForDate).not.toHaveBeenCalled();
    expect(repo.findDoctorAppointmentsForDate).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-041 uses current Vietnam week when weekStart is omitted', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-17T00:00:00Z'));
    try {
      const { repo, service } = createService();

      const result = await service.getWeeklySchedule('1');

      expect(result).toMatchObject({ weekStart: '2026-07-13', weekEnd: '2026-07-19' });
      expect(repo.findWeeklyWithDetails).toHaveBeenCalledWith('1', '2026-07-13', '2026-07-19', undefined);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns not found when weekly schedule has no shifts', async () => {
    const { repo, service } = createService();
    repo.findWeeklyWithDetails.mockResolvedValueOnce([]);

    await expect(service.getWeeklySchedule('1', '2099-07-06')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns not found when doctor availability has no working shifts', async () => {
    const { repo, service } = createService();
    repo.findDoctorShiftsForDate.mockResolvedValueOnce([]);

    await expect(service.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('TC-UNIT-DSHIFT-042 validates conflict-check input without throwing on conflict details', async () => {
    const { repo, service } = createService();
    repo.findConflicts.mockResolvedValueOnce({ doctorConflicts: [shift], roomConflicts: [] });

    await expect(service.checkConflicts({
      doctorId: '1',
      facilityId: '1',
      roomId: '2',
      shiftDate: '2099-07-07',
      startTime: '08:00',
      endTime: '12:00',
    })).resolves.toMatchObject({ hasConflict: true });
  });

  it('creates an OFF shift without requiring a room', async () => {
    const { repo, service } = createService();

    await expect(service.create({
      doctorId: '1',
      facilityId: '1',
      shiftDate: '2099-07-07',
      startTime: '08:00',
      endTime: '12:00',
      status: DoctorShiftStatus.OFF,
    } as never)).resolves.toMatchObject({ status: DoctorShiftStatus.OFF });
    expect(roomsService.findById).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: DoctorShiftStatus.OFF }));
  });

  it('keeps all availability slots when appointments do not overlap the shift', async () => {
    const { repo, service } = createService();
    repo.findDoctorShiftsForDate.mockResolvedValueOnce([{
      ...shift,
      startTime: '08:00:00',
      endTime: '09:00:00',
      maxAppointments: 10,
    }]);
    repo.findDoctorAppointmentsForDate.mockResolvedValueOnce([{
      id: 'outside',
      scheduledStart: new Date('2099-07-07T10:00:00'),
      scheduledEnd: new Date('2099-07-07T10:30:00'),
      status: 'booked',
    }]);

    const result = await service.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
      slotMinutes: 30,
    });

    expect(result.shifts[0].bookedAppointments).toBe(0);
    expect(result.shifts[0].availableSlots).toEqual([
      { startTime: '08:00:00', endTime: '08:30:00' },
      { startTime: '08:30:00', endTime: '09:00:00' },
    ]);
  });

  it('does not generate a partial trailing availability slot', async () => {
    const { repo, service } = createService();
    repo.findDoctorShiftsForDate.mockResolvedValueOnce([{
      ...shift,
      startTime: '08:00:00',
      endTime: '09:20:00',
      maxAppointments: 10,
    }]);

    const result = await service.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
      slotMinutes: 30,
    });

    expect(result.shifts[0].availableSlots).toEqual([
      { startTime: '08:00:00', endTime: '08:30:00' },
      { startTime: '08:30:00', endTime: '09:00:00' },
    ]);
  });

  it('copies available and off shifts without changing their statuses', async () => {
    const { repo, service } = createService();
    repo.findWeekly.mockResolvedValueOnce([
      { ...shift, id: '1', shiftDate: '2099-07-06', status: DoctorShiftStatus.AVAILABLE },
      { ...shift, id: '2', roomId: null, shiftDate: '2099-07-07', status: DoctorShiftStatus.OFF },
    ]);

    await service.copyWeek({
      facilityId: '1',
      sourceWeekStart: '2099-07-06',
      targetWeekStart: '2099-07-13',
    });

    expect(repo.saveMany).toHaveBeenCalledWith([
      expect.objectContaining({ shiftDate: '2099-07-13', status: DoctorShiftStatus.AVAILABLE }),
      expect.objectContaining({ shiftDate: '2099-07-14', status: DoctorShiftStatus.OFF, roomId: null }),
    ]);
  });

  it('propagates disruption cancellation errors when removing a shift with appointments', async () => {
    const { repo, service } = createService();
    repo.findAppointmentsForShift
      .mockResolvedValueOnce([{
        id: 'a1',
        scheduledStart: new Date('2099-07-07T08:00:00'),
        scheduledEnd: new Date('2099-07-07T08:30:00'),
        status: 'booked',
      }])
      .mockResolvedValueOnce([{
        id: 'a1',
        scheduledStart: new Date('2099-07-07T08:00:00'),
        scheduledEnd: new Date('2099-07-07T08:30:00'),
        status: 'booked',
      }]);
    repo.cancelShiftWithDisruption.mockRejectedValueOnce(new Error('transaction failed'));

    await expect(service.remove('10')).rejects.toThrow('transaction failed');
    expect(repo.remove).not.toHaveBeenCalled();
  });
});

describe('DoctorShifts helper functions', () => {
  it('TC-UNIT-DSHIFT-058 detects overlap and non-overlap at boundaries', () => {
    expect(timesOverlap('08:00', '10:00', '09:00', '11:00')).toBe(true);
    expect(timesOverlap('08:00', '10:00', '10:00', '11:00')).toBe(false);
    expect(timesOverlap('08:00', '10:00', '07:00', '08:00')).toBe(false);
  });

  it('TC-UNIT-DSHIFT-059 builds shift dates that match selected working days', () => {
    expect(buildShiftDates('2099-07-06', '2099-07-10', [
      ShiftWorkingDay.MON,
      ShiftWorkingDay.WED,
    ])).toEqual(['2099-07-06', '2099-07-08']);
  });

  it('TC-UNIT-DSHIFT-060 converts Date values to HH:mm:ss', () => {
    expect(dateTimeToTime(new Date(2099, 6, 7, 8, 30, 5))).toBe('08:30:05');
  });

  it('converts time strings to minutes using normalized HH:mm:ss values', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('08:30:00')).toBe(510);
  });

  it('converts minute offsets back to HH:mm:ss', () => {
    expect(minutesToTime(0)).toBe('00:00:00');
    expect(minutesToTime(510)).toBe('08:30:00');
    expect(minutesToTime(1439)).toBe('23:59:00');
  });
});

describe('DoctorShiftsController unit routing and scope', () => {
  const shift = {
    id: '10',
    doctorId: '1',
    facilityId: '1',
    roomId: '2',
    shiftDate: '2099-07-07',
    startTime: '08:00',
    endTime: '12:00',
    maxAppointments: 10,
    status: DoctorShiftStatus.AVAILABLE,
  };
  const scopedUser = {
    id: '99',
    roles: [{ name: RoleEnum.ADMIN }],
    activeFacilityId: '1',
    facilities: [{ id: '1', status: FacilityStatus.ACTIVE, roles: [{ name: RoleEnum.ADMIN }] }],
  };
  const superUser = {
    id: '1',
    roles: [{ name: RoleEnum.SUPER_ADMIN }],
    facilities: [],
  };
  const createController = () => {
    const service = {
      findAll: jest.fn().mockResolvedValue([shift]),
      findAllPaginated: jest.fn().mockResolvedValue({ items: [shift], total: 1, page: 1, limit: 20 }),
      checkConflicts: jest.fn().mockResolvedValue({ hasConflict: false, doctorConflicts: [], roomConflicts: [] }),
      bulkCreate: jest.fn().mockResolvedValue([shift]),
      copyWeek: jest.fn().mockResolvedValue([shift]),
      getDoctorAvailability: jest.fn().mockResolvedValue({ shifts: [] }),
      getWeeklySchedule: jest.fn().mockResolvedValue({ days: [] }),
      findById: jest.fn().mockResolvedValue(shift),
      findDetailsById: jest.fn().mockResolvedValue(shift),
      create: jest.fn().mockResolvedValue(shift),
      update: jest.fn().mockResolvedValue({ ...shift, startTime: '09:00' }),
      remove: jest.fn().mockResolvedValue({ action: 'hard_deleted', affectedCount: 0 }),
    };
    return { service, controller: new DoctorShiftsController(service as never) };
  };

  it('TC-UNIT-DSHIFT-049 chooses paginated or non-paginated list method by query.page', async () => {
    const { service, controller } = createController();

    await expect(controller.findAll(superUser as never, { page: 1 } as never)).resolves.toMatchObject({
      data: { total: 1 },
    });
    await expect(controller.findAll(superUser as never, {} as never)).resolves.toMatchObject({
      data: [shift],
    });
    expect(service.findAllPaginated).toHaveBeenCalledWith({ page: 1 });
    expect(service.findAll).toHaveBeenCalledWith({});
  });

  it('TC-UNIT-DSHIFT-050 rejects weekly calendar requests without facilityId', async () => {
    const { controller } = createController();

    await expect(controller.getWeekly(superUser as never, {} as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TC-UNIT-DSHIFT-051 checks facility scope before updating a shift', async () => {
    const { service, controller } = createController();
    service.findById.mockResolvedValueOnce({ ...shift, facilityId: '2' });

    await expect(controller.update(scopedUser as never, '10', { startTime: '09:00' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('TC-UNIT-DSHIFT-052 passes null deletedBy when remove is called without user', async () => {
    const { service, controller } = createController();

    await expect(controller.remove(undefined as never, '10', 'cleanup')).resolves.toMatchObject({
      data: { action: 'hard_deleted' },
    });
    expect(service.remove).toHaveBeenCalledWith('10', 'cleanup', null);
  });

  it('wraps create responses with the expected message and data', async () => {
    const { service, controller } = createController();

    await expect(controller.create(scopedUser as never, shift as never)).resolves.toMatchObject({ data: shift });
    expect(service.create).toHaveBeenCalledWith(shift);
  });

  it('wraps detail responses from findOne', async () => {
    const { service, controller } = createController();

    await expect(controller.findOne(scopedUser as never, '10')).resolves.toMatchObject({ data: shift });
    expect(service.findDetailsById).toHaveBeenCalledWith('10');
  });

  it('wraps conflict-check responses', async () => {
    const { service, controller } = createController();
    const dto = { doctorId: '1', facilityId: '1', shiftDate: '2099-07-07', startTime: '08:00', endTime: '12:00' };

    await expect(controller.checkConflicts(scopedUser as never, dto as never)).resolves.toMatchObject({
      data: { hasConflict: false },
    });
    expect(service.checkConflicts).toHaveBeenCalledWith(dto);
  });

  it('routes bulk-create and copy-week commands to the service', async () => {
    const { service, controller } = createController();
    const bulkDto = {
      doctorId: '1',
      facilityId: '1',
      fromDate: '2099-07-06',
      toDate: '2099-07-13',
      workingDays: [ShiftWorkingDay.MON],
      startTime: '08:00',
      endTime: '12:00',
      status: DoctorShiftStatus.AVAILABLE,
    };
    const copyDto = {
      facilityId: '1',
      sourceWeekStart: '2099-07-06',
      targetWeekStart: '2099-07-13',
    };

    await expect(controller.bulkCreate(bulkDto as never)).resolves.toMatchObject({ data: [shift] });
    await expect(controller.copyWeek(copyDto)).resolves.toMatchObject({ data: [shift] });
    expect(service.bulkCreate).toHaveBeenCalledWith(bulkDto);
    expect(service.copyWeek).toHaveBeenCalledWith(copyDto);
  });

  it('routes availability and valid weekly calendar requests to the service', async () => {
    const { service, controller } = createController();

    await expect(controller.getDoctorAvailability('1', {
      facilityId: '1',
      date: '2099-07-07',
      slotMinutes: 30,
    })).resolves.toMatchObject({ data: { shifts: [] } });
    await expect(controller.getWeekly(superUser as never, {
      facilityId: '1',
      weekStart: '2099-07-06',
      doctorId: '2',
    } as never)).resolves.toMatchObject({ data: { days: [] } });
    expect(service.getDoctorAvailability).toHaveBeenCalledWith('1', {
      facilityId: '1',
      date: '2099-07-07',
      slotMinutes: 30,
    });
    expect(service.getWeeklySchedule).toHaveBeenCalledWith('1', '2099-07-06', '2');
  });
});

describe('DoctorShiftsRepository unit query behavior', () => {
  const shift = {
    id: '10',
    doctorId: '1',
    facilityId: '1',
    roomId: '2',
    shiftDate: '2099-07-07',
    startTime: '08:00',
    endTime: '12:00',
    maxAppointments: 10,
    status: DoctorShiftStatus.AVAILABLE,
  };

  const createQueryBuilder = (result: unknown[] = []) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ identifiers: [{ id: '88' }] }),
      getMany: jest.fn().mockResolvedValue(result),
      getRawMany: jest.fn().mockResolvedValue(result),
      getRawOne: jest.fn().mockResolvedValue({ count: '1' }),
    };
    return qb;
  };

  it('TC-UNIT-DSHIFT-043 builds doctor and room conflict queries with excludeShiftId', async () => {
    const doctorQb = createQueryBuilder([{ id: 'doctor-conflict' }]);
    const roomQb = createQueryBuilder([{ id: 'room-conflict' }]);
    const repository = new DoctorShiftsRepository({
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(doctorQb)
        .mockReturnValueOnce(roomQb),
    } as never);

    await expect(repository.findConflicts({
      doctorId: '1',
      roomId: '2',
      shiftDate: '2099-07-07',
      startTime: '08:00',
      endTime: '12:00',
      excludeShiftId: '10',
    })).resolves.toEqual({
      doctorConflicts: [{ id: 'doctor-conflict' }],
      roomConflicts: [{ id: 'room-conflict' }],
    });
    expect(doctorQb.andWhere).toHaveBeenCalledWith('doctor_shifts.status IN (:...statuses)', {
      statuses: ['available', 'full', 'off'],
    });
    expect(roomQb.andWhere).toHaveBeenCalledWith('doctor_shifts.status IN (:...statuses)', {
      statuses: ['available', 'full'],
    });
    expect(doctorQb.andWhere).toHaveBeenCalledWith('doctor_shifts.id != :excludeShiftId', { excludeShiftId: '10' });
    expect(roomQb.andWhere).toHaveBeenCalledWith('doctor_shifts.id != :excludeShiftId', { excludeShiftId: '10' });
  });

  it('TC-UNIT-DSHIFT-044 skips the room conflict query when roomId is absent', async () => {
    const doctorQb = createQueryBuilder([]);
    const typeormRepo = { createQueryBuilder: jest.fn().mockReturnValueOnce(doctorQb) };
    const repository = new DoctorShiftsRepository(typeormRepo as never);

    await expect(repository.findConflicts({
      doctorId: '1',
      shiftDate: '2099-07-07',
      startTime: '08:00',
      endTime: '12:00',
    })).resolves.toEqual({ doctorConflicts: [], roomConflicts: [] });
    expect(typeormRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('TC-UNIT-DSHIFT-045 wraps shift cancellation, log, disruption, and items in one transaction', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const insertQb = createQueryBuilder();
    const manager = {
      update,
      createQueryBuilder: jest.fn().mockReturnValue(insertQb),
      findOneByOrFail: jest.fn().mockResolvedValue({ ...shift, status: DoctorShiftStatus.CANCELLED }),
    };
    const repository = new DoctorShiftsRepository({
      manager: {
        transaction: jest.fn(async callback => callback(manager)),
      },
    } as never);
    const appointment = {
      id: 'a1',
      scheduledStart: new Date('2099-07-07T08:00:00'),
      scheduledEnd: new Date('2099-07-07T08:30:00'),
      status: 'booked',
    };

    await expect(repository.cancelShiftWithDisruption(shift as never, [appointment], 'reason', '99')).resolves.toEqual({
      shift: { ...shift, status: DoctorShiftStatus.CANCELLED },
      disruptionId: '88',
    });
    expect(update).toHaveBeenCalledWith(expect.any(Function), '10', expect.objectContaining({
      status: DoctorShiftStatus.CANCELLED,
      deletedBy: '99',
      deleteReason: 'reason',
    }));
    expect(manager.createQueryBuilder).toHaveBeenCalledTimes(3);
    expect(insertQb.into).toHaveBeenCalledWith('doctor_shift_change_logs');
    expect(insertQb.into).toHaveBeenCalledWith('shift_disruptions');
    expect(insertQb.into).toHaveBeenCalledWith('appointment_disruption_items');
  });

  it('TC-UNIT-DSHIFT-046 does not create disruption records when no active appointments are affected', async () => {
    const insertQb = createQueryBuilder();
    const manager = {
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(insertQb),
      findOneByOrFail: jest.fn().mockResolvedValue({ ...shift, status: DoctorShiftStatus.CANCELLED }),
    };
    const repository = new DoctorShiftsRepository({
      manager: {
        transaction: jest.fn(async callback => callback(manager)),
      },
    } as never);

    await expect(repository.cancelShiftWithDisruption(shift as never, [], undefined, null)).resolves.toEqual({
      shift: { ...shift, status: DoctorShiftStatus.CANCELLED },
      disruptionId: undefined,
    });
    expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(insertQb.into).toHaveBeenCalledWith('doctor_shift_change_logs');
    expect(insertQb.into).not.toHaveBeenCalledWith('shift_disruptions');
  });

  it('TC-UNIT-DSHIFT-047 queries only appointment statuses that still hold a slot', async () => {
    const qb = createQueryBuilder([]);
    const repository = new DoctorShiftsRepository({
      manager: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
    } as never);

    await repository.findDoctorAppointmentsForDate('1', '2', '2099-07-07');

    expect(qb.andWhere).toHaveBeenCalledWith('appointment.status IN (:...activeStatuses)', {
      activeStatuses: ['pending_payment', 'booked', 'confirmed', 'checked_in', 'in_progress'],
    });
  });

  it('queries only available and full shifts when building doctor availability', async () => {
    const qb = createQueryBuilder([]);
    const repository = new DoctorShiftsRepository({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as never);

    await repository.findDoctorShiftsForDate('1', '2', '2099-07-07');

    expect(qb.andWhere).toHaveBeenCalledWith('shift.status IN (:...statuses)', {
      statuses: [DoctorShiftStatus.AVAILABLE, DoctorShiftStatus.FULL],
    });
    expect(qb.orderBy).toHaveBeenCalledWith('shift.startTime', 'ASC');
  });

  it('adds doctor filter only when finding a weekly schedule for a specific doctor', async () => {
    const allDoctorsQb = createQueryBuilder([]);
    const oneDoctorQb = createQueryBuilder([]);
    const repository = new DoctorShiftsRepository({
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(allDoctorsQb)
        .mockReturnValueOnce(oneDoctorQb),
    } as never);

    await repository.findWeekly('1', '2099-07-06', '2099-07-12');
    await repository.findWeekly('1', '2099-07-06', '2099-07-12', '2');

    expect(allDoctorsQb.andWhere).not.toHaveBeenCalledWith('shift.doctorId = :doctorId', { doctorId: '2' });
    expect(oneDoctorQb.andWhere).toHaveBeenCalledWith('shift.doctorId = :doctorId', { doctorId: '2' });
  });

  it('adds active appointment status filtering when finding appointments for a shift with activeOnly=true', async () => {
    const qb = createQueryBuilder([]);
    const repository = new DoctorShiftsRepository({
      manager: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
    } as never);

    await repository.findAppointmentsForShift(shift as never, true);

    expect(qb.andWhere).toHaveBeenCalledWith('appointment.status IN (:...statuses)', {
      statuses: ['pending_payment', 'booked', 'confirmed', 'checked_in', 'in_progress'],
    });
  });

  it('does not add active appointment status filtering by default when finding appointments for a shift', async () => {
    const qb = createQueryBuilder([]);
    const repository = new DoctorShiftsRepository({
      manager: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
    } as never);

    await repository.findAppointmentsForShift(shift as never);

    expect(qb.andWhere).not.toHaveBeenCalledWith('appointment.status IN (:...statuses)', expect.any(Object));
  });

  it.each([
    ['1', true],
    ['0', false],
    [undefined, false],
  ])('TC-UNIT-DSHIFT-048 returns %s assignment count as %s', async (count, expected) => {
    const qb = createQueryBuilder();
    qb.getRawOne.mockResolvedValueOnce(count === undefined ? undefined : { count });
    const repository = new DoctorShiftsRepository({
      manager: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
    } as never);

    await expect(repository.isDoctorAssignedToFacility('1', '1')).resolves.toBe(expected);
  });
});

describe('DoctorShifts future backend unit test backlog', () => {
  it.todo('rejects overlapping shifts created concurrently when repository/database unique or lock strategy is introduced');
  it.todo('verifies cancellation disruption rollback leaves no partial change-log/disruption records on transaction failure');
  it.todo('blocks cancelling a shift after appointment cutoff time when appointment policy is implemented');
  it.todo('prevents copying a source week into target dates that are holidays when holiday calendar support exists');
  it.todo('validates maxAppointments against actual active appointment count before lowering capacity on update');
});
