import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth/auth.service';
import { FacilitiesService } from './facilities/facilities.service';
import { JobsService } from './jobs/jobs.service';
import { PermissionsService } from './permissions/permissions.service';
import { RolesService } from './roles/roles.service';
import { RoomsService } from './rooms/rooms.service';
import { SettingsService } from './settings/settings.service';
import { UploadsService } from './uploads/uploads.service';
import { UsersService } from './users/users.service';
import { FacilityStatus } from '../common/constants/status.enum';

describe('module services', () => {
  const entity = { id: '1', name: 'Test', code: 'TEST', email: 'test@example.com', status: 1 };

  it('covers permissions service CRUD branches', async () => {
    const repo = {
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: '1', ...data })),
      findAll: jest.fn().mockResolvedValue([entity]),
      findById: jest.fn().mockResolvedValue(entity),
      findByIds: jest.fn().mockResolvedValue([entity]),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PermissionsService(repo as never);

    await expect(service.create({ name: 'user.view' })).resolves.toMatchObject({
      name: 'user.view',
    });
    await expect(service.findAll()).resolves.toEqual([entity]);
    await expect(service.findById('1')).resolves.toEqual(entity);
    await expect(service.findByIds(['1'])).resolves.toEqual([entity]);
    await expect(service.update('1', { name: 'user.update' })).resolves.toMatchObject({
      name: 'user.update',
    });
    await expect(service.remove('1')).resolves.toBeUndefined();

    repo.findByName.mockResolvedValueOnce(entity);
    await expect(service.create({ name: 'user.view' })).rejects.toBeInstanceOf(ConflictException);
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('covers roles service CRUD branches', async () => {
    const repo = {
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: '1', ...data })),
      findAll: jest.fn().mockResolvedValue([entity]),
      findById: jest.fn().mockResolvedValue(entity),
      findByIds: jest.fn().mockResolvedValue([entity]),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const permissionsService = { findByIds: jest.fn().mockResolvedValue([entity]) };
    const service = new RolesService(repo as never, permissionsService as never);

    await expect(service.create({ name: 'admin', permissionIds: ['1'] })).resolves.toMatchObject({
      name: 'admin',
    });
    await expect(service.findAll()).resolves.toEqual([entity]);
    await expect(service.findById('1')).resolves.toEqual(entity);
    await expect(
      service.update('1', { name: 'admin', permissionIds: ['1'] }),
    ).resolves.toMatchObject({ name: 'admin' });
    await expect(service.remove('1')).resolves.toBeUndefined();

    repo.findByName.mockResolvedValueOnce(entity);
    await expect(service.create({ name: 'admin' })).rejects.toBeInstanceOf(ConflictException);
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('covers users service read, update profile, and remove flows', async () => {
    const user = { ...entity, roles: [], permissionOverrides: [] };
    const repo = {
      findAll: jest.fn().mockResolvedValue([user]),
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ ...user, ...data })),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const userPermissionsRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const config = { getOrThrow: jest.fn().mockReturnValue(10) };
    const staffProfileRepository = {
      checkPersonalEmailExists: jest.fn().mockResolvedValue(false),
      generateStaffEmailFromName: jest.fn().mockResolvedValue('staff@example.com'),
      generateStaffPassword: jest.fn().mockReturnValue('secret1'),
      generateStaffEmployeeCode: jest.fn().mockResolvedValue('0001'),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const mailService = {
      sendCreatedAccountEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };
    const service = new UsersService(
      repo as never,
      {
        findByIds: jest.fn().mockResolvedValue([]),
        findByName: jest.fn().mockResolvedValue({ id: 'role-1', name: 'staff', permissions: [] }),
      } as never,
      { findByIds: jest.fn().mockResolvedValue([]) } as never,
      cache as never,
      userPermissionsRepository as never,
      config as never,
      staffProfileRepository as never,
      mailService as never,
      {
        delete: jest.fn().mockResolvedValue(undefined),
        create: jest.fn((data) => data),
        save: jest.fn().mockResolvedValue(undefined),
      } as never,
      { count: jest.fn().mockResolvedValue(1) } as never,
      {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((data) => data),
        save: jest.fn(async (data) => ({ id: 'doctor-1', ...data })),
      } as never,
    );

    await expect(service.findAll()).resolves.toEqual([user]);
    await expect(service.findById('1')).resolves.toEqual(user);
    await expect(service.updateProfile('1', { name: 'Updated' })).resolves.toMatchObject({
      name: 'Updated',
    });
    await expect(service.updateStatus('1', 0 as never)).resolves.toBeUndefined();

    repo.findById.mockResolvedValueOnce(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('covers settings, uploads, and jobs services', async () => {
    const settingsRepo = {
      findPublic: jest.fn().mockResolvedValue([{ key: 'site_name', value: 'Maternity Care' }]),
      findAll: jest.fn().mockResolvedValue([entity]),
      findByKey: jest.fn().mockResolvedValue(entity),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: '1', ...data })),
    };
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const settingsService = new SettingsService(settingsRepo as never, cache as never);
    await expect(settingsService.findPublic()).resolves.toEqual({ site_name: 'Maternity Care' });
    await expect(settingsService.findAll()).resolves.toEqual([entity]);
    await expect(settingsService.findByKey('site_name')).resolves.toEqual(entity);
    await expect(
      settingsService.upsert({ key: 'site_name', value: { text: 'Maternity Care' } }),
    ).resolves.toMatchObject({
      value: { text: 'Maternity Care' },
    });

    const storage = { createPresignedUpload: jest.fn().mockResolvedValue({ url: 'url' }) };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'storage.allowedMimeTypes': ['image/png'],
          'storage.maxFileSizeMb': 10,
          'storage.presignExpiresIn': 300,
        };
        return values[key];
      }),
    } as unknown as ConfigService;
    const uploadsService = new UploadsService(storage as never, config);
    await expect(
      uploadsService.createUserPresignedUpload('1', {
        fileName: 'scan.png',
        mimeType: 'image/png',
        size: 10,
      }),
    ).resolves.toEqual({
      url: 'url',
    });

    const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const jobsService = new JobsService(queue as never);
    await expect(jobsService.createTestJob({ message: 'hello' })).resolves.toEqual({
      jobId: 'job-1',
    });
  });

  it('covers facilities and rooms services', async () => {
    const facilityRepo = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: '1', ...data })),
      findAll: jest.fn().mockResolvedValue([entity]),
      findById: jest.fn().mockResolvedValue(entity),
      findByName: jest.fn().mockResolvedValue(entity),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const facilitiesService = new FacilitiesService(facilityRepo as never);
    await expect(
      facilitiesService.create({
        name: 'Main',
        code: 'MAIN',
        phone: '0900000000',
        address: 'Address',
        province: 'Province',
        district: 'District',
        ward: 'Ward',
        status: FacilityStatus.ACTIVE,
      }),
    ).resolves.toMatchObject({ code: 'MAIN' });
    await expect(facilitiesService.findAll()).resolves.toEqual([entity]);
    await expect(facilitiesService.findById('1')).resolves.toEqual(entity);
    await expect(facilitiesService.remove('1')).resolves.toBeUndefined();

    const room = { id: '1', name: 'Room 1', facilityId: '1' };
    const roomsRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: '1', ...data })),
      findAll: jest.fn().mockResolvedValue([room]),
      findById: jest.fn().mockResolvedValue(room),
      findByName: jest.fn().mockResolvedValue(room),
      findByFacilityId: jest.fn().mockResolvedValue([room]),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const roomsService = new RoomsService(roomsRepo as never, facilitiesService);
    await expect(
      roomsService.create({ name: 'Room 1', facilityId: '1', status: 'available' } as never),
    ).resolves.toMatchObject({
      name: 'Room 1',
    });
    await expect(roomsService.findAll()).resolves.toEqual([room]);
    await expect(roomsService.findByFacilityId('1')).resolves.toEqual({
      facility: entity,
      rooms: [room],
    });
    await expect(roomsService.findAllWithRooms()).resolves.toEqual([
      { facility: entity, rooms: [room] },
    ]);
  });

  it('covers auth service invalid login branch', async () => {
    const service = new AuthService(
      { findByEmailWithPassword: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.login({ email: 'missing@test.com', password: 'secret1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
