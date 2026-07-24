import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FacilityStatus, ActiveStatus } from '../../common/constants/status.enum';
import { RoleEnum } from '../../common/constants/role.enum';
import { ROOM_CONSTANT } from '../../common/constants/room.constant';
import { Facility } from '../facilities/entities/facility.entity';
import { Room } from './entities/room.entity';
import { FacilityRoomTypesController } from './facility-room-types.controller';
import { RoomsController } from './rooms.controller';
import { RoomsFacilityController } from './rooms-facility.controller';
import { RoomsService } from './rooms.service';

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

const createRoom = (overrides: Partial<Room> = {}): Room => ({
  id: 'room-1',
  facilityId: 'fac-1',
  facility: createFacility(),
  code: 'R-FAC-001-001',
  name: 'Room 101',
  roomTypeId: 'type-1',
  roomType: {
    id: 'type-1',
    code: 'CONSULTATION',
    name: 'Consultation',
    description: 'Consultation room',
    status: ActiveStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
  },
  floor: '1',
  status: ActiveStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  deletedBy: null,
  deletedReason: null,
  ...overrides,
});

const createRoomType = (overrides: any = {}) => ({
  id: 'type-1',
  code: 'CONSULTATION',
  name: 'Consultation',
  description: 'Consultation room',
  status: ActiveStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  ...overrides,
});

// describe: danh sach cac test case cho RoomsService
describe('RoomsService', () => {
  const createRepository = () => ({
    create: jest.fn((dto) => ({ id: 'draft', ...dto })),
    save: jest.fn(async (room) => ({ ...room, id: room.id === 'draft' ? 'room-1' : room.id })),
    saveMany: jest.fn(async (rooms: Room[]) => rooms.map((room: Room, index: number) => ({ ...room, id: `room-${index + 1}` }))),
    findCodesByFacilityAndPrefix: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findDetailsById: jest.fn(),
    findByName: jest.fn(),
    findByFacilityAndName: jest.fn(),
    createRoomType: jest.fn((dto) => ({ id: 'draft-type', ...dto })),
    saveRoomType: jest.fn(async (roomType) => ({ ...roomType, id: roomType.id === 'draft-type' ? 'type-1' : roomType.id })),
    findAllRoomTypes: jest.fn(),
    findAllRoomTypesPaginated: jest.fn(),
    findRoomTypeById: jest.fn(),
    findRoomTypeByName: jest.fn(),
    findRoomTypeCodesByPrefix: jest.fn(),
    findRoomTypesByFacilityId: jest.fn(),
    lookup: jest.fn(),
    lookupRoomTypes: jest.fn(),
    removeRoomType: jest.fn(),
    countRoomTypeDependencies: jest.fn(),
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
    repository.findDetailsById.mockResolvedValue(createRoom());
    repository.findCodesByFacilityAndPrefix.mockResolvedValue([]);
    repository.findByFacilityAndName.mockResolvedValue(null);
    repository.findRoomTypeById.mockResolvedValue(createRoomType());
    repository.findRoomTypeByName.mockResolvedValue(null);
    repository.findRoomTypeCodesByPrefix.mockResolvedValue([]);
    repository.findRoomTypesByFacilityId.mockResolvedValue([]);
    facilitiesService = createFacilitiesService();
    service = new RoomsService(repository as any, facilitiesService as any);
  });

  // Vai tro: dam bao tao room phai check facility ton tai truoc khi save phong.
  it('creates a room after verifying the facility exists', async () => {
    const dto = { facilityId: 'fac-1', name: 'Room 101', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE };
    facilitiesService.findById.mockResolvedValue(createFacility());

    await expect(service.create(dto as any)).resolves.toMatchObject(dto);
    expect(facilitiesService.findById).toHaveBeenCalledWith('fac-1');
    expect(repository.findRoomTypeById).toHaveBeenCalledWith('type-1');
    expect(repository.findByFacilityAndName).toHaveBeenCalledWith('fac-1', 'Room 101', undefined);
    expect(repository.findCodesByFacilityAndPrefix).toHaveBeenCalledWith('fac-1', 'R-FAC-001');
    expect(repository.create).toHaveBeenCalledWith({ ...dto, code: 'R-FAC-001-001' });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  // Vai tro: dam bao API bulk-create tao nhieu phong trong cung transaction va tra detail da join.
  it('bulk creates rooms after validating every payload item', async () => {
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.findDetailsById
      .mockResolvedValueOnce({ ...createRoom(), id: 'room-1', name: 'Room 101' } as any)
      .mockResolvedValueOnce({ ...createRoom(), id: 'room-2', name: 'Room 102' } as any);

    await expect(service.bulkCreate({
      rooms: [
        { facilityId: 'fac-1', name: 'Room 101', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE },
        { facilityId: 'fac-1', name: 'Room 102', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE },
      ],
    })).resolves.toEqual([
      expect.objectContaining({ id: 'room-1', name: 'Room 101' }),
      expect.objectContaining({ id: 'room-2', name: 'Room 102' }),
    ]);
    expect(repository.saveMany).toHaveBeenCalledTimes(1);
  });

  // Vai tro: chan bulk-create neu trong payload co ten phong bi trung trong cung co so.
  it('rejects duplicated room names inside a bulk-create payload', async () => {
    await expect(service.bulkCreate({
      rooms: [
        { facilityId: 'fac-1', name: 'Room 101', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE },
        { facilityId: 'fac-1', name: ' room 101 ', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE },
      ],
    })).rejects.toBeInstanceOf(Error);
    expect(repository.saveMany).not.toHaveBeenCalled();
  });

  // Vai tro: duplicate trong bulk-create phai tra lai payload bi trung de FE highlight dung dong nhap loi.
  it('returns duplicated payload data when bulk-create has duplicated room name', async () => {
    let error: any;
    try {
      await service.bulkCreate({
        rooms: [
          { facilityId: 'fac-1', name: 'Room 101', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE },
          { facilityId: 'fac-1', name: ' room 101 ', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE },
        ],
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error?.getResponse()).toMatchObject({
      data: {
        duplicatedField: 'name',
        duplicatedData: {
          facilityId: 'fac-1',
          name: ' room 101 ',
          roomTypeId: 'type-1',
        },
      },
    });
    expect(repository.saveMany).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao facility khong ton tai thi room khong duoc tao.
  it('does not create a room when the facility is missing', async () => {
    const error = new NotFoundException('facility not found');
    facilitiesService.findById.mockRejectedValue(error);

    await expect(service.create({ facilityId: 'missing' } as any)).rejects.toBe(error);
    expect(repository.create).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao loi save room tu repository duoc nem ra de debug dung nguyen nhan.
  it('propagates repository save errors during create', async () => {
    const error = new Error('db down');
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.save.mockRejectedValue(error);

    await expect(service.create({
      facilityId: 'fac-1',
      name: 'Room 101',
      roomTypeId: 'type-1',
      floor: '1',
      status: ActiveStatus.ACTIVE,
    } as any)).rejects.toBe(error);
  });

  // Vai tro: kiem tra service goi dung repository cho ca danh sach thuong va phan trang.
  it('delegates findAll and findAllPaginated to repository', async () => {
    const rooms = [createRoom()];
    const paged = { items: rooms, total: 1, page: 1, limit: 10 };
    repository.findAll.mockResolvedValue(rooms);
    repository.findAllPaginated.mockResolvedValue(paged);

    await expect(service.findAll({ facilityId: 'fac-1' } as any)).resolves.toBe(rooms);
    await expect(service.findAllPaginated({ page: 1, limit: 10 } as any)).resolves.toBe(paged);
  });

  // Vai tro: danh sach room rong phai tra 404 de FE khong hieu nham la request thanh cong co du lieu.
  it('throws not found when room list is empty', async () => {
    repository.findAll.mockResolvedValue([]);
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });

    await expect(service.findAll()).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findAllPaginated({ page: 1, limit: 10 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: CRUD room-type tao danh muc loai phong sau khi check trung ten.
  it('creates a room type when name is unique', async () => {
    const dto = { name: 'Ultrasound', description: 'Ultrasound room', status: ActiveStatus.ACTIVE };

    await expect(service.createRoomType(dto as any)).resolves.toMatchObject(dto);

    expect(repository.findRoomTypeByName).toHaveBeenCalledWith('Ultrasound', undefined);
    expect(repository.findRoomTypeCodesByPrefix).toHaveBeenCalledWith('ULTRASOUND');
    expect(repository.createRoomType).toHaveBeenCalledWith({ ...dto, code: 'ULTRASOUND' });
    expect(repository.saveRoomType).toHaveBeenCalledTimes(1);
  });

  // Vai tro: khong cho tao 2 loai phong trung ten de FE select khong bi nham.
  it('rejects duplicated room type name during create', async () => {
    const duplicatedRoomType = createRoomType({ id: 'type-2' });
    repository.findRoomTypeByName.mockResolvedValue(duplicatedRoomType);

    await expect(service.createRoomType({ name: 'Consultation', description: 'Dup', status: ActiveStatus.ACTIVE } as any))
      .rejects.toBeInstanceOf(ConflictException);
    await service.createRoomType({ name: 'Consultation', description: 'Dup', status: ActiveStatus.ACTIVE } as any).catch((error) => {
      expect(error.getResponse()).toMatchObject({
        message: ROOM_CONSTANT.ROOM_TYPE_ALREADY_EXISTS,
        data: {
          duplicatedField: 'name',
          duplicatedData: {
            id: 'type-2',
            name: duplicatedRoomType.name,
            status: duplicatedRoomType.status,
          },
        },
      });
    });
    expect(repository.saveRoomType).not.toHaveBeenCalled();
  });

  // Vai tro: list room-type rong phai tra 404 ro rang, khong tra success voi mang rong.
  it('throws not found when room type list is empty', async () => {
    repository.findAllRoomTypes.mockResolvedValue([]);

    await expect(service.findAllRoomTypes()).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: lay danh sach room-type thuong va phan trang cho man hinh quan tri danh muc.
  it('returns room type list and paginated list when data exists', async () => {
    const roomTypes = [createRoomType()];
    const paged = { items: roomTypes, total: 1, page: 1, limit: 10 };
    repository.findAllRoomTypes.mockResolvedValue(roomTypes);
    repository.findAllRoomTypesPaginated.mockResolvedValue(paged);

    await expect(service.findAllRoomTypes({ search: 'consult' } as any)).resolves.toBe(roomTypes);
    await expect(service.findAllRoomTypesPaginated({ page: 1 } as any)).resolves.toBe(paged);
  });

  // Vai tro: update room-type check trung ten neu doi name.
  it('updates room type after duplicate name check', async () => {
    repository.findRoomTypeById.mockResolvedValue(createRoomType());

    await expect(service.updateRoomType('type-1', { name: 'Exam room' } as any)).resolves.toMatchObject({
      id: 'type-1',
      name: 'Exam room',
    });
    expect(repository.findRoomTypeByName).toHaveBeenCalledWith('Exam room', 'type-1');
  });

  // Vai tro: xoa cung room-type khi chua co phong nao dang su dung.
  it('hard deletes unused room type', async () => {
    const roomType = createRoomType();
    repository.findRoomTypeById.mockResolvedValue(roomType);
    repository.countRoomTypeDependencies.mockResolvedValue(0);

    await expect(service.removeRoomType('type-1')).resolves.toEqual({ action: 'hard_deleted', affectedCount: 0 });
    expect(repository.removeRoomType).toHaveBeenCalledWith(roomType);
  });

  // Vai tro: room-type da duoc rooms tham chieu thi chi inactive, khong xoa cung de tranh vo lich su.
  it('deactivates room type when rooms depend on it', async () => {
    const roomType = createRoomType();
    repository.findRoomTypeById.mockResolvedValue(roomType);
    repository.countRoomTypeDependencies.mockResolvedValue(2);

    await expect(service.removeRoomType('type-1')).resolves.toEqual({ action: 'soft_deleted', affectedCount: 2 });
    expect(repository.removeRoomType).not.toHaveBeenCalled();
    expect(repository.saveRoomType).toHaveBeenCalledWith(expect.objectContaining({ status: ActiveStatus.INACTIVE }));
  });

  // Vai tro: dam bao service lay duoc room co ban va ban detail co join thong tin facility.
  it('finds a room by id and details by id', async () => {
    const room = createRoom();
    repository.findById.mockResolvedValue(room);
    repository.findDetailsById.mockResolvedValue({ ...room, facilityName: 'Main Clinic' });

    await expect(service.findById('room-1')).resolves.toBe(room);
    await expect(service.findDetailsById('room-1')).resolves.toMatchObject({ facilityName: 'Main Clinic' });
  });

  // Vai tro: dam bao room/detail khong ton tai se tra 404 ro rang.
  it('throws not found when room id or detail id is missing', async () => {
    repository.findById.mockResolvedValue(null);
    repository.findDetailsById.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findDetailsById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: kiem tra ham tim room theo ten duoc chuyen xuong repository.
  it('delegates findByName to repository', async () => {
    const room = createRoom();
    repository.findByName.mockResolvedValue(room);

    await expect(service.findByName('Room 101')).resolves.toBe(room);
  });

  // Vai tro: dam bao update room ton tai se merge field moi va save lai.
  it('updates an existing room', async () => {
    const room = createRoom();
    repository.findById.mockResolvedValue(room);
    repository.save.mockImplementation(async (value) => value);
    repository.findDetailsById.mockImplementation(async () => room as any);

    await expect(service.update('room-1', { name: 'Room 102' } as any)).resolves.toMatchObject({ name: 'Room 102' });
    expect(repository.save).toHaveBeenCalledWith(room);
  });

  // Vai tro: khi ten room trong cung facility da ton tai, loi 409 tra kem room bi trung da join thong tin lien quan.
  it('returns duplicated room data when room name already exists in facility', async () => {
    const duplicatedRoom = createRoom({ id: 'room-2', name: 'Room 102' });
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.findByFacilityAndName.mockResolvedValue(duplicatedRoom);
    repository.findDetailsById.mockResolvedValue({ ...duplicatedRoom, facilityName: 'Main Clinic', roomTypeName: 'Consultation' } as any);

    let error: ConflictException | undefined;
    try {
      await service.create({
        facilityId: 'fac-1',
        name: 'Room 102',
        roomTypeId: 'type-1',
        floor: '1',
        status: ActiveStatus.ACTIVE,
      } as any);
    } catch (caughtError) {
      error = caughtError as ConflictException;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect(error!.getResponse()).toMatchObject({
      message: ROOM_CONSTANT.ROOM_ALREADY_EXISTS,
      data: {
        duplicatedField: 'name',
        duplicatedData: {
          id: 'room-2',
          facilityId: 'fac-1',
          roomTypeId: 'type-1',
          name: 'Room 102',
          facilityName: 'Main Clinic',
          roomTypeName: 'Consultation',
        },
      },
    });
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao update room khong ton tai thi khong goi save.
  it('does not save when update target is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update('missing', { name: 'Room 102' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra rule xoa cung room khi chua co appointment/shift/du lieu lien quan.
  it('hard deletes a room when it has no dependencies', async () => {
    const room = createRoom();
    repository.findById.mockResolvedValue(room);
    repository.countDependencies.mockResolvedValue(0);

    await expect(service.remove('room-1')).resolves.toEqual({ action: 'hard_deleted', affectedCount: 0 });
    expect(repository.remove).toHaveBeenCalledWith(room);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  // Vai tro: kiem tra rule xoa mem room khi da co du lieu lien quan va can giu lich su.
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

  // Vai tro: dam bao remove room khong ton tai dung lai truoc khi dem dependency.
  it('does not delete when remove target is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.countDependencies).not.toHaveBeenCalled();
  });

  // Vai tro: dam bao API lay room theo facility tra kem thong tin facility khi khong phan trang.
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

  // Vai tro: dam bao lay room theo facility co page se tra cau truc rooms phan trang.
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

  // Vai tro: dam bao facility co ton tai nhung khong co room trong trang yeu cau thi tra 404.
  it.each([null, { items: null }, { items: [] }])('throws not found for empty facility-room page %#', async (paged) => {
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.findByFacilityIdPaginated.mockResolvedValue(paged as any);

    await expect(service.findByFacilityId('fac-1', { page: 1 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: facility co ton tai nhung chua co phong nao thi API rooms-by-facility tra 404 ro rang.
  it('throws not found when facility has no rooms without pagination', async () => {
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.findByFacilityId.mockResolvedValue([]);

    await expect(service.findByFacilityId('fac-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  // Vai tro: kiem tra man hinh tong hop facility + rooms khi khong can phan trang.
  it('returns facilities with rooms without pagination', async () => {
    const facilities = [createFacility(), createFacility({ id: 'fac-2', code: 'FAC-002' })];
    facilitiesService.findAll.mockResolvedValue(facilities);
    repository.findByFacilityId.mockResolvedValueOnce([createRoom()]).mockResolvedValueOnce([]);

    await expect(service.findAllWithRooms()).resolves.toEqual([
      { facility: facilities[0], rooms: [expect.objectContaining({ id: 'room-1' })] },
      { facility: facilities[1], rooms: [] },
    ]);
  });

  // Vai tro: dam bao loi load rooms cua mot facility khong lam sap toan bo danh sach facility.
  it('keeps a facility in findAllWithRooms when loading its rooms fails', async () => {
    const facility = createFacility();
    facilitiesService.findAll.mockResolvedValue([facility]);
    repository.findByFacilityId.mockRejectedValue(new Error('room query failed'));

    await expect(service.findAllWithRooms()).resolves.toEqual([{ facility, rooms: [] }]);
  });

  // Vai tro: kiem tra cau truc phan trang long nhau: facility phan trang va room trong moi facility cung phan trang.
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

  // Vai tro: cung cap lookup room va room-type cho FE select/autocomplete ma khong can ghep API list.
  it('delegates room and room-type lookup to repository', async () => {
    const roomOptions = [{ id: 'room-1', name: 'Room 101', facilityId: 'fac-1', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE }];
    const roomTypeOptions = [{ id: 'type-1', name: 'Consultation', description: 'Consultation room', status: ActiveStatus.ACTIVE }];
    repository.lookup.mockResolvedValue(roomOptions);
    repository.lookupRoomTypes.mockResolvedValue(roomTypeOptions);

    await expect(service.lookup({ search: '101' })).resolves.toBe(roomOptions);
    await expect(service.lookupRoomTypes({ search: 'consult' })).resolves.toBe(roomTypeOptions);
  });

  // Vai tro: tra ve cac loai phong dang that su duoc co so su dung, kem so phong active.
  it('returns room types used by a facility with room count', async () => {
    const roomTypes = [{
      id: 'type-1',
      code: 'CONSULTATION',
      name: 'Consultation',
      description: 'Consultation room',
      status: ActiveStatus.ACTIVE,
      roomCount: '2',
    }];
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.findRoomTypesByFacilityId.mockResolvedValue(roomTypes);

    await expect(service.findRoomTypesByFacilityId('fac-1', { search: 'consult' })).resolves.toEqual([
      expect.objectContaining({
        id: 'type-1',
        roomCount: 2,
      }),
    ]);
    expect(repository.findRoomTypesByFacilityId).toHaveBeenCalledWith('fac-1', { search: 'consult' });
  });

  // Vai tro: neu co so chua co phong active nao thuoc room type nao thi tra 404 ro rang.
  it('throws not found when a facility has no used room types', async () => {
    facilitiesService.findById.mockResolvedValue(createFacility());
    repository.findRoomTypesByFacilityId.mockResolvedValue([]);

    await expect(service.findRoomTypesByFacilityId('fac-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RoomsController', () => {
  const room = {
    id: 'room-1',
    facilityId: 'fac-1',
    name: 'Room 101',
    roomTypeId: 'type-1',
    roomTypeName: 'Consultation',
    status: ActiveStatus.ACTIVE,
  };

  const roomType = createRoomType();

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
    findRoomTypesByFacilityId: jest.fn(),
    bulkCreate: jest.fn(),
    lookup: jest.fn(),
    lookupRoomTypes: jest.fn(),
    createRoomType: jest.fn(),
    findAllRoomTypes: jest.fn(),
    findAllRoomTypesPaginated: jest.fn(),
    findRoomTypeById: jest.fn(),
    updateRoomType: jest.fn(),
    removeRoomType: jest.fn(),
  });

  // Vai tro: dam bao user bi scope facility khong the tu query room cua facility khac.
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

  // Vai tro: kiem tra controller room chon ham phan trang khi query co page.
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

  // Vai tro: chan facility admin xem chi tiet room nam ngoai facility cua minh.
  it('denies room details when room belongs to another facility', async () => {
    const service = createService();
    service.findDetailsById.mockResolvedValue({ ...room, facilityId: 'fac-2' });
    const controller = new RoomsController(service as any);

    await expect(controller.findOne(facilityAdmin, 'room-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  // Vai tro: dam bao khi user co activeFacilityId thi backend tu gan facilityId, khong tin payload FE.
  it('overrides create dto facilityId for scoped users', async () => {
    const service = createService();
    service.create.mockImplementation(async (dto) => ({ ...room, ...dto }));
    const dto = { facilityId: 'fac-2', name: 'Room 101', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE } as any;
    const controller = new RoomsController(service as any);

    await expect(controller.create(facilityAdmin, dto)).resolves.toMatchObject({
      message: ROOM_CONSTANT.CREATED_SUCCESSFULLY,
      data: { facilityId: 'fac-1' },
    });
    expect(dto.facilityId).toBe('fac-1');
  });

  // Vai tro: dam bao bulk-create cua user bi scope facility se ep tat ca room ve activeFacilityId cua user.
  it('overrides bulk-create facilityId for scoped users', async () => {
    const service = createService();
    service.bulkCreate.mockResolvedValue([room]);
    const dto = {
      rooms: [
        { facilityId: 'fac-2', name: 'Room 101', roomTypeId: 'type-1', floor: '1', status: ActiveStatus.ACTIVE },
      ],
    } as any;
    const controller = new RoomsController(service as any);

    await expect(controller.bulkCreate(facilityAdmin, dto)).resolves.toMatchObject({
      message: ROOM_CONSTANT.CREATED_SUCCESSFULLY,
      data: [room],
    });
    expect(service.bulkCreate).toHaveBeenCalledWith({
      rooms: [expect.objectContaining({ facilityId: 'fac-1' })],
    });
  });

  // Vai tro: controller list room-type dung service thuong khi khong co page.
  it('returns room type list', async () => {
    const service = createService();
    service.findAllRoomTypes.mockResolvedValue([roomType]);
    const controller = new RoomsController(service as any);

    await expect(controller.findAllRoomTypes({ search: 'consult' } as any)).resolves.toEqual({
      message: ROOM_CONSTANT.ROOM_TYPE_FOUND,
      data: [roomType],
    });
    expect(service.findAllRoomTypes).toHaveBeenCalledWith({ search: 'consult' });
  });

  // Vai tro: controller list room-type dung service phan trang khi query co page.
  it('returns paginated room type list', async () => {
    const service = createService();
    const paged = { items: [roomType], total: 1, page: 1, limit: 10 };
    service.findAllRoomTypesPaginated.mockResolvedValue(paged);
    const controller = new RoomsController(service as any);

    await expect(controller.findAllRoomTypes({ page: 1 } as any)).resolves.toEqual({
      message: ROOM_CONSTANT.ROOM_TYPE_FOUND,
      data: paged,
    });
  });

  // Vai tro: CRUD room-type o controller tra dung message va data cho Swagger/FE.
  it('creates, reads, updates and deletes room type through controller', async () => {
    const service = createService();
    service.createRoomType.mockResolvedValue(roomType);
    service.findRoomTypeById.mockResolvedValue(roomType);
    service.updateRoomType.mockResolvedValue({ ...roomType, name: 'Exam room' });
    service.removeRoomType.mockResolvedValue({ action: 'hard_deleted', affectedCount: 0 });
    const controller = new RoomsController(service as any);

    await expect(controller.createRoomType({ name: 'Consultation', description: 'Consultation room', status: ActiveStatus.ACTIVE }))
      .resolves.toEqual({ message: ROOM_CONSTANT.ROOM_TYPE_CREATED_SUCCESSFULLY, data: roomType });
    await expect(controller.findRoomTypeById('type-1'))
      .resolves.toEqual({ message: ROOM_CONSTANT.ROOM_TYPE_DETAIL_FOUND, data: roomType });
    await expect(controller.updateRoomType('type-1', { name: 'Exam room' }))
      .resolves.toEqual({ message: ROOM_CONSTANT.ROOM_TYPE_UPDATED_SUCCESSFULLY, data: { ...roomType, name: 'Exam room' } });
    await expect(controller.removeRoomType('type-1'))
      .resolves.toEqual({ message: ROOM_CONSTANT.ROOM_TYPE_DELETED_SUCCESSFULLY, data: { action: 'hard_deleted', affectedCount: 0 } });
  });

  // Vai tro: dam bao truoc khi update room, controller check room do thuoc facility user dang quan ly.
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

  // Vai tro: dam bao delete room truyen ly do va currentUserId xuong service de audit.
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

  // Vai tro: dam bao endpoint tong hop rooms chi tra facility active cua user co scope.
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

  // Vai tro: chuan hoa loi bat ngo o RoomsController thanh 500 thay vi leak loi raw.
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

  // Vai tro: dam bao controller public/scoped theo facility tra rooms khi user duoc phep truy cap facility do.
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

  // Vai tro: chan request lay rooms cua facility khac activeFacilityId cua user.
  it('denies rooms-by-facility request outside active facility', async () => {
    const service = { findByFacilityId: jest.fn() };
    const controller = new RoomsFacilityController(service as any);

    await expect(controller.findRoomsByFacility(facilityAdmin, 'fac-2', {} as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findByFacilityId).not.toHaveBeenCalled();
  });
});

describe('FacilityRoomTypesController', () => {
  const facilityAdmin = {
    id: 'user-admin',
    activeFacilityId: 'fac-1',
    roles: [{ name: RoleEnum.ADMIN }],
    facilities: [{ id: 'fac-1', status: FacilityStatus.ACTIVE, roles: [{ name: RoleEnum.ADMIN }] }],
  } as any;

  // Vai tro: tra room types dang co trong facility de FE dung lam select/filter theo co so.
  it('returns room types for an allowed facility', async () => {
    const data = [{
      id: 'type-1',
      code: 'CONSULTATION',
      name: 'Consultation',
      description: 'Consultation room',
      status: ActiveStatus.ACTIVE,
      roomCount: 2,
    }];
    const service = {
      findRoomTypesByFacilityId: jest.fn().mockResolvedValue(data),
    };
    const controller = new FacilityRoomTypesController(service as any);

    await expect(controller.findRoomTypesByFacility(facilityAdmin, 'fac-1', { search: 'consult' })).resolves.toEqual({
      message: ROOM_CONSTANT.ROOM_TYPE_FOUND,
      data,
    });
    expect(service.findRoomTypesByFacilityId).toHaveBeenCalledWith('fac-1', { search: 'consult' });
  });

  // Vai tro: khong cho admin co so lay room types cua facility khac.
  it('denies facility room types outside active facility', async () => {
    const service = { findRoomTypesByFacilityId: jest.fn() };
    const controller = new FacilityRoomTypesController(service as any);

    await expect(controller.findRoomTypesByFacility(facilityAdmin, 'fac-2', {} as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findRoomTypesByFacilityId).not.toHaveBeenCalled();
  });
});
