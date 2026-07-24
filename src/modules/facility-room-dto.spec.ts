import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActiveStatus, FacilityStatus } from '../common/constants/status.enum';
import { CreateFacilityDto } from './facilities/dto/requests/create-facility.dto';
import { SearchFacilityDto } from './facilities/dto/requests/search-facility.dto';
import { UpdateFacilityDto } from './facilities/dto/requests/update-facility.dto';
import { CreateRoomDto } from './rooms/dto/requests/create-room.dto';
import { SearchRoomsDto } from './rooms/dto/requests/search-rooms.dto';
import { UpdateRoomDto } from './rooms/dto/requests/update-room.dto';

const validFacility = {
  name: 'Bệnh viện Phụ sản Trung tâm',
  ownerId: '1',
  phone: '02873001234',
  email: 'contact@facility.vn',
  schedules: [
    { days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], openTime: '08:00', closeTime: '17:30', isClosed: false },
    { days: ['SUN'], isClosed: true },
  ],
  address: '123 Nguyễn Thị Minh Khai',
  province: 'Hồ Chí Minh',
  ward: 'Phường 5',
  latitude: '10.7756',
  longitude: '106.6871',
  status: FacilityStatus.ACTIVE,
};

describe('Facility CRUD DTO validation', () => {
  // Vai tro: dam bao payload tao facility hop le duoc trim/chuan hoa email; code se do backend tu sinh.
  it('accepts and normalizes a valid create payload', async () => {
    const dto = plainToInstance(CreateFacilityDto, {
      ...validFacility,
      name: '  Bệnh viện   Phụ sản Trung tâm ',
      email: ' CONTACT@FACILITY.VN ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      name: 'Bệnh viện Phụ sản Trung tâm',
      email: 'contact@facility.vn',
    });
  });

  // Vai tro: code la ma noi bo tu sinh nen FE/client khong duoc dua vao DTO create.
  it('does not allow manual facility code in create payload', async () => {
    const dto = plainToInstance(CreateFacilityDto, { ...validFacility, code: 'CS-HCM-01' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(error => error.property === 'code')).toBe(true);
  });

  // Vai tro: gom cac case input sai thuong gap de chac DTO create facility chan dung tung field nghiep vu.
  it.each([
    [{ ...validFacility, phone: '123' }, 'phone'],
    [{ ...validFacility, email: 'invalid-email' }, 'email'],
    [{ ...validFacility, ownerId: '0' }, 'ownerId'],
    [{ ...validFacility, schedules: [{ days: ['MON'], openTime: '18:00', closeTime: '08:00', isClosed: false }] }, 'schedules'],
    [{ ...validFacility, schedules: [{ days: ['MON'], openTime: '08:00', isClosed: false }] }, 'schedules'],
    [{ ...validFacility, schedules: [{ days: ['XXX'], openTime: '08:00', closeTime: '17:30', isClosed: false }] }, 'schedules'],
    [{ ...validFacility, latitude: '91' }, 'latitude'],
    [{ ...validFacility, longitude: undefined }, 'longitude'],
    [{ ...validFacility, status: FacilityStatus.DELETED }, 'status'],
  ])('rejects invalid create field %s', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateFacilityDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  // Vai tro: kiem tra DTO update facility cho phep update mot phan nhung van bat cap field phu thuoc voi nhau.
  it('validates update fields and requires paired operational fields', async () => {
    expect(await validate(plainToInstance(UpdateFacilityDto, { name: 'Cơ sở mới' }))).toHaveLength(0);
    const errors = await validate(plainToInstance(UpdateFacilityDto, {
      email: 'invalid',
      latitude: '10.7',
    }));
    expect(errors.map(error => error.property)).toEqual(
      expect.arrayContaining(['email', 'longitude']),
    );
  });

  // Vai tro: code da phat hanh khong duoc update tu client de tranh vo lien ket/report.
  it('does not allow facility code in update payload', async () => {
    const dto = plainToInstance(UpdateFacilityDto, { code: 'CS-HN-99', name: 'CÆ¡ sá»Ÿ má»›i' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(error => error.property === 'code')).toBe(true);
  });

  // Vai tro: dam bao query phan trang facility khong nhan page/limit vuot bien hop le.
  it('limits facility pagination input', async () => {
    const dto = plainToInstance(SearchFacilityDto, { page: '0', limit: '101' });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['page', 'limit']),
    );
  });
});

describe('Room CRUD DTO validation', () => {
  // Vai tro: dam bao payload tao room hop le duoc trim/chuan hoa chuoi truoc khi tao phong.
  it('accepts and normalizes a valid room', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      facilityId: '1', name: '  Phòng   khám 201 ', roomTypeId: '2',
      floor: ' Tầng 2 ', status: ActiveStatus.ACTIVE,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ name: 'Phòng khám 201', roomTypeId: '2', floor: 'Tầng 2' });
  });

  // Vai tro: gom cac case input tao room sai de DTO bat loi facilityId, ten phong, loai phong va status.
  it.each([
    [{ facilityId: '0', name: 'Phòng 1', roomTypeId: '1', floor: '1', status: ActiveStatus.ACTIVE }, 'facilityId'],
    [{ facilityId: '1', name: ' ', roomTypeId: '1', floor: '1', status: ActiveStatus.ACTIVE }, 'name'],
    [{ facilityId: '1', name: 'Phòng 1', roomTypeId: '0', floor: '1', status: ActiveStatus.ACTIVE }, 'roomTypeId'],
    [{ facilityId: '1', name: 'Phòng 1', roomTypeId: '1', floor: '1', status: 'deleted' }, 'status'],
  ])('rejects invalid room create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateRoomDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  // Vai tro: bao ve nghiep vu khong cho doi facilityId cua room qua API update room.
  it('does not allow facilityId in room update payload', async () => {
    const dto = plainToInstance(UpdateRoomDto, { facilityId: '2', name: 'Phòng mới' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(error => error.property === 'facilityId')).toBe(true);
  });

  // Vai tro: dam bao query tim room bat dung id va tham so phan trang khong hop le.
  it('validates room search IDs and pagination', async () => {
    const dto = plainToInstance(SearchRoomsDto, { facilityId: '-1', page: '1.5', limit: '101' });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['facilityId', 'page', 'limit']),
    );
  });
});
