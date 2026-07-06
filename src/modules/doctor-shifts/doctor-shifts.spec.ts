import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActiveStatus, DoctorShiftStatus, FacilityStatus } from '../../common/constants/status.enum';
import { CheckShiftConflictDto } from './dto/requests/check-shift-conflict.dto';
import { CreateDoctorShiftDto } from './dto/requests/create-doctor-shift.dto';
import { SearchDoctorShiftDto } from './dto/requests/search-doctor-shift.dto';
import { UpdateDoctorShiftDto } from './dto/requests/update-doctor-shift.dto';
import { DoctorShiftsService } from './doctor-shifts.service';
import { DoctorShiftsValidator } from './validators/doctor-shifts.validator';

describe('DoctorShifts DTO validation', () => {
  const validPayload = {
    doctorId: '1', facilityId: '1', roomId: '2', shiftDate: '2099-07-07',
    startTime: '08:00', endTime: '12:00', maxAppointments: 10,
    status: DoctorShiftStatus.AVAILABLE,
  };

  it('accepts a valid create payload and transforms maxAppointments', async () => {
    const dto = plainToInstance(CreateDoctorShiftDto, { ...validPayload, maxAppointments: '10' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.maxAppointments).toBe(10);
  });

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
});

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
    findAllPaginated: jest.fn(),
    findConflicts: jest.fn().mockResolvedValue({ doctorConflicts: [], roomConflicts: [] }),
    findWeekly: jest.fn().mockResolvedValue([{ ...shift }]),
    isDoctorAssignedToFacility: jest.fn().mockResolvedValue(true),
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
    expect(repo.findWeekly).toHaveBeenCalledWith('1', '2099-07-06', '2099-07-12', '1');
  });
});
