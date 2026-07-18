import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FacilityStatus, ActiveStatus } from '../../common/constants/status.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { ROOM_CONSTANT } from '../../common/constants/room.constant';
import { Facility } from '../facilities/entities/facilities.entity';
import { Room } from './entities/rooms.entity';
import { RoomsController } from './rooms.controller';
import { RoomsFacilityController } from './rooms-facility.controller';
import { RoomsService } from './rooms.service';

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

const createRoom = (overrides: Partial<Room> = {}): Room => ({
  id: 'room-1',
  facilityId: 'fac-1',
  facility: createFacility(),
  name: 'Room 101',
  roomType: 'consultation',
  floor: '1',
  status: ActiveStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  ...overrides,
});

describe('RoomsService', () => {
  const createRepository = () => ({
    create: jest.fn((dto) => ({ id: 'draft', ...dto })),
    save: jest.fn(async (room) => ({ ...room, id: room.id === 'draft' ? 'room-1' : room.id })),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findDetailsById: jest.fn(),
    findByName: jest.fn(),
    remove: jest.fn(),
    countDependencies: jest.fn(),
    softDelete: jest.fn(),
    findByFacilityId: jest.fn(),
    findByFacilityIdPaginated: jest.fn(),
    findAllRoomsWithFacilitiesPaginated: jest.fn(),
  });

  const createFacilitiesService = () => ({
    findById: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
  });

  let repository: ReturnType<typeof createRepository>;
  let facilitiesService: ReturnType<typeof createFacilitiesService>;
  let service: RoomsService;

  beforeEach(() => {
    repository = createRepository();
    facilitiesService = createFacilitiesService();
    service = new RoomsService(repository as any, facilitiesService as any);
  });

  it('creates a room after verifying the facility exists', async () => {
    const dto = { facilityId: 'fac-1', name: 'Room 101', roomType: 'consultation' };
    facilitiesService.findById.mockResolvedValue(createFacility());

    await expect(service.create(dto as any)).resolves.toMatchObject(dto);
    expect(facilitiesService.findById).toHaveBeenCalledWith('fac-1');
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('does not create a room when the facility is missing', async () => {
    const error = new NotFoundException('facility not found');
    facilitiesService.findById.mockRejectedValue(error);

    await expect(service.create({ facilityId: 'missing' } as any)).rejects.toBe(error);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('propagates repository save errors during create', async () => {
    const error = new Error('db down');
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.save.mockRejectedValue(error);

    await expect(service.create({ facilityId: 'fac-1' } as any)).rejects.toBe(error);
  });

  it('delegates findAll and findAllPaginated to repository', async () => {
    const rooms = [createRoom()];
    const paged = { items: rooms, total: 1, page: 1, limit: 10 };
    repository.findAll.mockResolvedValue(rooms);
    repository.findAllPaginated.mockResolvedValue(paged);

    await expect(service.findAll({ facilityId: 'fac-1' } as any)).resolves.toBe(rooms);
    await expect(service.findAllPaginated({ page: 1, limit: 10 } as any)).resolves.toBe(paged);
  });

  it('finds a room by id and details by id', async () => {
    const room = createRoom();
    repository.findById.mockResolvedValue(room);
    repository.findDetailsById.mockResolvedValue({ ...room, facilityName: 'Main Clinic' });

    await expect(service.findById('room-1')).resolves.toBe(room);
    await expect(service.findDetailsById('room-1')).resolves.toMatchObject({ facilityName: 'Main Clinic' });
  });

  it('throws not found when room id or detail id is missing', async () => {
    repository.findById.mockResolvedValue(null);
    repository.findDetailsById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findDetailsById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates findByName to repository', async () => {
    const room = createRoom();
    repository.findByName.mockResolvedValue(room);

    await expect(service.findByName('Room 101')).resolves.toBe(room);
  });

  it('updates an existing room', async () => {
    const room = createRoom();
    repository.findById.mockResolvedValue(room);
    repository.save.mockImplementation(async (value) => value);

    await expect(service.update('room-1', { name: 'Room 102' } as any)).resolves.toMatchObject({ name: 'Room 102' });
    expect(repository.save).toHaveBeenCalledWith(room);
  });

  it('does not save when update target is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing', { name: 'Room 102' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('hard deletes a room when it has no dependencies', async () => {
    const room = createRoom();
    repository.findById.mockResolvedValue(room);
    repository.countDependencies.mockResolvedValue(0);

    await expect(service.remove('room-1')).resolves.toEqual({ action: 'hard_deleted', affectedCount: 0 });
    expect(repository.remove).toHaveBeenCalledWith(room);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('soft deletes a room when dependencies exist', async () => {
    const room = createRoom();
    repository.findById.mockResolvedValue(room);
    repository.countDependencies.mockResolvedValue(4);

    await expect(service.remove('room-1', 'has appointments', 'user-9')).resolves.toEqual({
      action: 'soft_deleted',
      affectedCount: 4,
    });
    expect(repository.softDelete).toHaveBeenCalledWith(room, 'has appointments', 'user-9');
  });

  it('does not delete when remove target is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.countDependencies).not.toHaveBeenCalled();
  });

  it('returns rooms for a facility without pagination', async () => {
    const facility = createFacility();
    const rooms = [createRoom()];
    facilitiesService.findById.mockResolvedValue(facility);
    repository.findByFacilityId.mockResolvedValue(rooms);

    await expect(service.findByFacilityId('fac-1', { status: ActiveStatus.ACTIVE } as any)).resolves.toEqual({
      facility,
      rooms,
    });
  });

  it('returns paginated rooms for a facility when page is provided', async () => {
    const facility = createFacility();
    const paged = { items: [createRoom()], total: 1, page: 1, limit: 10 };
    facilitiesService.findById.mockResolvedValue(facility);
    repository.findByFacilityIdPaginated.mockResolvedValue(paged);

    await expect(service.findByFacilityId('fac-1', { page: 1, limit: 10 } as any)).resolves.toEqual({
      facility,
      rooms: paged,
    });
  });

  it.each([null, { items: null }, { items: [] }])('throws not found for empty facility-room page %#', async (paged) => {
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.findByFacilityIdPaginated.mockResolvedValue(paged as any);

    await expect(service.findByFacilityId('fac-1', { page: 1 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns facilities with rooms without pagination', async () => {
    const facilities = [createFacility(), createFacility({ id: 'fac-2', code: 'FAC-002' })];
    facilitiesService.findAll.mockResolvedValue(facilities);
    repository.findByFacilityId.mockResolvedValueOnce([createRoom()]).mockResolvedValueOnce([]);

    await expect(service.findAllWithRooms()).resolves.toEqual([
      { facility: facilities[0], rooms: [expect.objectContaining({ id: 'room-1' })] },
      { facility: facilities[1], rooms: [] },
    ]);
  });

  it('keeps a facility in findAllWithRooms when loading its rooms fails', async () => {
    const facility = createFacility();
    facilitiesService.findAll.mockResolvedValue([facility]);
    repository.findByFacilityId.mockRejectedValue(new Error('room query failed'));

    await expect(service.findAllWithRooms()).resolves.toEqual([{ facility, rooms: [] }]);
  });

  it('returns paginated facilities with paginated rooms', async () => {
    const facility = createFacility();
    const facilitiesPaged = { items: [facility], total: 1, page: 1, limit: 10 };
    const roomsPaged = { items: [createRoom()], total: 1, page: 1, limit: 5 };
    facilitiesService.findAllPaginated.mockResolvedValue(facilitiesPaged);
    repository.findByFacilityIdPaginated.mockResolvedValue(roomsPaged);

    await expect(service.findAllWithRooms(undefined, {
      facilityPage: 1,
      facilityLimit: 10,
      roomPage: 1,
      roomLimit: 5,
    })).resolves.toEqual({
      ...facilitiesPaged,
      items: [{ facility, rooms: roomsPaged }],
    });
  });
});

describe('RoomsController', () => {
  const room = {
    id: 'room-1',
    facilityId: 'fac-1',
    name: 'Room 101',
    roomType: 'consultation',
    status: ActiveStatus.ACTIVE,
  };

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
    update: jest.fn(),
    remove: jest.fn(),
    findByFacilityId: jest.fn(),
    findAllWithRooms: jest.fn(),
  });

  it('overrides facilityId with active facility when listing rooms', async () => {
    const service = createService();
    service.findAll.mockResolvedValue([room]);
    const query = { facilityId: 'fac-2' } as any;
    const controller = new RoomsController(service as any);

    await expect(controller.findAll(facilityAdmin, query)).resolves.toEqual({
      message: ROOM_CONSTANT.ROOM_FOUND,
      data: [room],
    });
    expect(query.facilityId).toBe('fac-1');
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('uses paginated service when page is provided', async () => {
    const service = createService();
    const paged = { items: [room], total: 1, page: 1, limit: 10 };
    service.findAllPaginated.mockResolvedValue(paged);
    const controller = new RoomsController(service as any);

    await expect(controller.findAll(superAdmin, { page: 1 } as any)).resolves.toEqual({
      message: ROOM_CONSTANT.ROOM_FOUND,
      data: paged,
    });
  });

  it('denies room details when room belongs to another facility', async () => {
    const service = createService();
    service.findDetailsById.mockResolvedValue({ ...room, facilityId: 'fac-2' });
    const controller = new RoomsController(service as any);

    await expect(controller.findOne(facilityAdmin, 'room-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('overrides create dto facilityId for scoped users', async () => {
    const service = createService();
    service.create.mockImplementation(async (dto) => ({ ...room, ...dto }));
    const dto = { facilityId: 'fac-2', name: 'Room 101', roomType: 'consultation' } as any;
    const controller = new RoomsController(service as any);

    await expect(controller.create(facilityAdmin, dto)).resolves.toMatchObject({
      message: ROOM_CONSTANT.CREATED_SUCCESSFULLY,
      data: { facilityId: 'fac-1' },
    });
    expect(dto.facilityId).toBe('fac-1');
  });

  it('checks existing room scope before update', async () => {
    const service = createService();
    service.findById.mockResolvedValue({ ...room, facilityId: 'fac-1' });
    service.update.mockResolvedValue({ ...room, name: 'Room 102' });
    const controller = new RoomsController(service as any);

    await expect(controller.update(facilityAdmin, 'room-1', { name: 'Room 102' } as any)).resolves.toMatchObject({
      message: ROOM_CONSTANT.UPDATED_SUCCESSFULLY,
      data: { name: 'Room 102' },
    });
  });

  it('passes delete reason and current user id to service remove', async () => {
    const service = createService();
    service.findById.mockResolvedValue({ ...room, facilityId: 'fac-1' });
    service.remove.mockResolvedValue({ action: 'hard_deleted', affectedCount: 0 });
    const controller = new RoomsController(service as any);

    await expect(controller.remove(facilityAdmin, 'room-1', 'old room')).resolves.toEqual({
      message: ROOM_CONSTANT.DELETED_SUCCESSFULLY,
      data: { action: 'hard_deleted', affectedCount: 0 },
    });
    expect(service.remove).toHaveBeenCalledWith('room-1', 'old room', 'user-admin');
  });

  it('returns only active facility rooms for findAllByFacilities when scoped', async () => {
    const service = createService();
    const byFacility = { facility: { id: 'fac-1' }, rooms: [room] };
    service.findByFacilityId.mockResolvedValue(byFacility);
    const controller = new RoomsController(service as any);

    await expect(controller.findAllByFacilities(facilityAdmin)).resolves.toEqual({
      message: ROOM_CONSTANT.ROOM_FOUND,
      data: [byFacility],
    });
  });

  it('converts unknown controller errors to internal server error', async () => {
    const service = createService();
    service.findAll.mockRejectedValue(new Error('unexpected'));
    const controller = new RoomsController(service as any);

    await expect(controller.findAll(superAdmin, {} as any)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe('RoomsFacilityController', () => {
  const facilityAdmin = {
    id: 'user-admin',
    activeFacilityId: 'fac-1',
    roles: [{ name: RoleEnum.ADMIN }],
    facilities: [{ id: 'fac-1', status: FacilityStatus.ACTIVE, roles: [{ name: RoleEnum.ADMIN }] }],
  } as any;

  it('returns rooms for an allowed facility', async () => {
    const service = {
      findByFacilityId: jest.fn().mockResolvedValue({ facility: { id: 'fac-1' }, rooms: [] }),
    };
    const controller = new RoomsFacilityController(service as any);

    await expect(controller.findRoomsByFacility(facilityAdmin, 'fac-1', { page: 1 } as any)).resolves.toMatchObject({
      data: { facility: { id: 'fac-1' }, rooms: [] },
    });
    expect(service.findByFacilityId).toHaveBeenCalledWith('fac-1', { page: 1 });
  });

  it('denies rooms-by-facility request outside active facility', async () => {
    const service = { findByFacilityId: jest.fn() };
    const controller = new RoomsFacilityController(service as any);

    await expect(controller.findRoomsByFacility(facilityAdmin, 'fac-2', {} as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findByFacilityId).not.toHaveBeenCalled();
  });
});
