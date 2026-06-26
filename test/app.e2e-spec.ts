import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { FacilitiesController } from '../src/modules/facilities/facilities.controller';
import { FacilitiesService } from '../src/modules/facilities/facilities.service';
import { JobsController } from '../src/modules/jobs/jobs.controller';
import { JobsService } from '../src/modules/jobs/jobs.service';
import { PermissionsController } from '../src/modules/permissions/permissions.controller';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { RolesController } from '../src/modules/roles/roles.controller';
import { RolesService } from '../src/modules/roles/roles.service';
import { RoomsFacilityController } from '../src/modules/rooms/rooms-facility.controller';
import { RoomsController } from '../src/modules/rooms/rooms.controller';
import { RoomsService } from '../src/modules/rooms/rooms.service';
import { ManagementSettingsController } from '../src/modules/settings/management-settings.controller';
import { SettingsController } from '../src/modules/settings/settings.controller';
import { SettingsService } from '../src/modules/settings/settings.service';
import { ManagementUploadsController } from '../src/modules/uploads/management-uploads.controller';
import { UploadsController } from '../src/modules/uploads/uploads.controller';
import { UploadsService } from '../src/modules/uploads/uploads.service';
import { ManagementUsersController } from '../src/modules/users/management-users.controller';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';

describe('Application routes (e2e)', () => {
  let app: INestApplication;
  const record = { id: '1', name: 'Test', email: 'test@example.com', roles: [] };

  beforeAll(async () => {
    const authService = {
      register: jest.fn().mockResolvedValue(record),
      login: jest.fn().mockResolvedValue(record),
      forgotPassword: jest.fn().mockResolvedValue({ reset_url: 'url', reset_token: 'token' }),
      resetPassword: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(record),
      logout: jest.fn().mockResolvedValue(undefined),
      me: jest.fn().mockResolvedValue(record),
    };
    const usersService = {
      findById: jest.fn().mockResolvedValue(record),
      updateProfile: jest.fn().mockResolvedValue(record),
      findAllUsers: jest.fn().mockResolvedValue({ data: [record], total: 1 }),
      createUser: jest.fn().mockResolvedValue(record),
      findUserById: jest.fn().mockResolvedValue(record),
      updateUser: jest.fn().mockResolvedValue(record),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const rolesService = {
      findAll: jest.fn().mockResolvedValue([record]),
      create: jest.fn().mockResolvedValue(record),
      findById: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const permissionsService = { ...rolesService };
    const settingsService = {
      findPublic: jest.fn().mockResolvedValue({ site_name: 'Maternity Care' }),
      findAll: jest.fn().mockResolvedValue([record]),
      findByKey: jest.fn().mockResolvedValue(record),
      upsert: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
    };
    const uploadsService = {
      createUserPresignedUpload: jest.fn().mockResolvedValue({ uploadUrl: 'url', key: 'key' }),
      createManagementPresignedUpload: jest
        .fn()
        .mockResolvedValue({ uploadUrl: 'url', key: 'key' }),
    };
    const jobsService = { createTestJob: jest.fn().mockResolvedValue({ jobId: '1' }) };
    const facilitiesService = {
      findAll: jest.fn().mockResolvedValue([record]),
      findById: jest.fn().mockResolvedValue(record),
      create: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const roomsService = {
      findAll: jest.fn().mockResolvedValue([record]),
      findAllWithRooms: jest.fn().mockResolvedValue([{ facility: record, rooms: [record] }]),
      findById: jest.fn().mockResolvedValue(record),
      create: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
      remove: jest.fn().mockResolvedValue(undefined),
      findByFacilityId: jest.fn().mockResolvedValue({ facility: record, rooms: [record] }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        UsersController,
        ManagementUsersController,
        RolesController,
        PermissionsController,
        SettingsController,
        ManagementSettingsController,
        UploadsController,
        ManagementUploadsController,
        JobsController,
        FacilitiesController,
        RoomsController,
        RoomsFacilityController,
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: RolesService, useValue: rolesService },
        { provide: PermissionsService, useValue: permissionsService },
        { provide: SettingsService, useValue: settingsService },
        { provide: UploadsService, useValue: uploadsService },
        { provide: JobsService, useValue: jobsService },
        { provide: FacilitiesService, useValue: facilitiesService },
        { provide: RoomsService, useValue: roomsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().user = { id: '1', email: 'test@example.com' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves auth routes', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@test.com', password: 'secret1' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'a@test.com' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toBe('Authenticated profile retrieved successfully');
      });
  });

  it('serves management and user resource routes', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(200);
    await request(app.getHttpServer()).get('/management/users').expect(200);
    await request(app.getHttpServer()).get('/management/roles').expect(200);
    await request(app.getHttpServer()).get('/management/permissions').expect(200);
    await request(app.getHttpServer()).get('/settings').expect(200);
    await request(app.getHttpServer()).get('/management/settings').expect(200);
  });

  it('serves uploads, jobs, facilities, and rooms routes', async () => {
    await request(app.getHttpServer()).post('/uploads/presign').send({}).expect(201);
    await request(app.getHttpServer()).post('/management/uploads/presign').send({}).expect(201);
    await request(app.getHttpServer())
      .post('/management/jobs/test')
      .send({ message: 'hello' })
      .expect(201);
    await request(app.getHttpServer()).get('/management/facilities').expect(200);
    await request(app.getHttpServer()).get('/management/rooms').expect(200);
    await request(app.getHttpServer()).get('/management/rooms/all/by-facilities').expect(200);
    await request(app.getHttpServer()).get('/management/facility/rooms/1').expect(200);
  });
});
