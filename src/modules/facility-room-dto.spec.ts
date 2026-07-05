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
  code: 'FAC-HCM-01',
  phone: '02873001234',
  email: 'contact@facility.vn',
  open_time: '08:00',
  close_time: '17:30',
  working_days: 'MON,TUE,WED,THU,FRI',
  address: '123 Nguyễn Thị Minh Khai',
  province: 'Hồ Chí Minh',
  district: 'Quận 3',
  ward: 'Phường 5',
  latitude: '10.7756',
  longitude: '106.6871',
  status: FacilityStatus.ACTIVE,
};

describe('Facility CRUD DTO validation', () => {
  it('accepts and normalizes a valid create payload', async () => {
    const dto = plainToInstance(CreateFacilityDto, {
      ...validFacility,
      name: '  Bệnh viện   Phụ sản Trung tâm ',
      code: ' fac-hcm-01 ',
      email: ' CONTACT@FACILITY.VN ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      name: 'Bệnh viện Phụ sản Trung tâm',
      code: 'FAC-HCM-01',
      email: 'contact@facility.vn',
    });
  });

  it.each([
    [{ ...validFacility, phone: '123' }, 'phone'],
    [{ ...validFacility, email: 'invalid-email' }, 'email'],
    [{ ...validFacility, open_time: '18:00', close_time: '08:00' }, 'close_time'],
    [{ ...validFacility, close_time: undefined }, 'close_time'],
    [{ ...validFacility, working_days: 'MON,MON' }, 'working_days'],
    [{ ...validFacility, latitude: '91' }, 'latitude'],
    [{ ...validFacility, longitude: undefined }, 'longitude'],
    [{ ...validFacility, status: FacilityStatus.DELETED }, 'status'],
  ])('rejects invalid create field %s', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateFacilityDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  it('validates update fields and requires paired operational fields', async () => {
    expect(await validate(plainToInstance(UpdateFacilityDto, { name: 'Cơ sở mới' }))).toHaveLength(0);
    const errors = await validate(plainToInstance(UpdateFacilityDto, {
      email: 'invalid',
      open_time: '08:00',
      latitude: '10.7',
    }));
    expect(errors.map(error => error.property)).toEqual(
      expect.arrayContaining(['email', 'close_time', 'longitude']),
    );
  });

  it('limits facility pagination input', async () => {
    const dto = plainToInstance(SearchFacilityDto, { page: '0', limit: '101' });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['page', 'limit']),
    );
  });
});

describe('Room CRUD DTO validation', () => {
  it('accepts and normalizes a valid room', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      facilityId: '1', name: '  Phòng   khám 201 ', roomType: ' Khám thai ',
      floor: ' Tầng 2 ', status: ActiveStatus.ACTIVE,
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ name: 'Phòng khám 201', roomType: 'Khám thai', floor: 'Tầng 2' });
  });

  it.each([
    [{ facilityId: '0', name: 'Phòng 1', roomType: 'Khám', status: ActiveStatus.ACTIVE }, 'facilityId'],
    [{ facilityId: '1', name: ' ', roomType: 'Khám', status: ActiveStatus.ACTIVE }, 'name'],
    [{ facilityId: '1', name: 'Phòng 1', roomType: ' ', status: ActiveStatus.ACTIVE }, 'roomType'],
    [{ facilityId: '1', name: 'Phòng 1', roomType: 'Khám', status: 'deleted' }, 'status'],
  ])('rejects invalid room create input', async (payload, property) => {
    const errors = await validate(plainToInstance(CreateRoomDto, payload));
    expect(errors.some(error => error.property === property)).toBe(true);
  });

  it('does not allow facilityId in room update payload', async () => {
    const dto = plainToInstance(UpdateRoomDto, { facilityId: '2', name: 'Phòng mới' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(error => error.property === 'facilityId')).toBe(true);
  });

  it('validates room search IDs and pagination', async () => {
    const dto = plainToInstance(SearchRoomsDto, { facilityId: '-1', page: '1.5', limit: '101' });
    expect((await validate(dto)).map(error => error.property)).toEqual(
      expect.arrayContaining(['facilityId', 'page', 'limit']),
    );
  });
});
