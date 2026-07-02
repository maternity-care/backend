import { AuthController } from './auth/auth.controller';
import { FacilitiesController } from './facilities/facilities.controller';
import { JobsController } from './jobs/jobs.controller';
import { PermissionsController } from './permissions/permissions.controller';
import { RolesController } from './roles/roles.controller';
import { RoomsFacilityController } from './rooms/rooms-facility.controller';
import { RoomsController } from './rooms/rooms.controller';
import { ManagementSettingsController } from './settings/management-settings.controller';
import { SettingsController } from './settings/settings.controller';
import { ManagementUploadsController } from './uploads/management-uploads.controller';
import { UploadsController } from './uploads/uploads.controller';
import { ManagementStaffsController } from './staffs/management-staffs.controller';
import { UsersController } from './users/users.controller';
import { RoleEnum } from '../common/constants/role.enum';
import { RESPONSE_MESSAGES } from '../common/constants/response-message.constant';

describe('module controllers', () => {
  const user = {
    id: '1',
    name: 'Test',
    roles: [{ id: '1', name: 'super_admin', permissions: [] }],
    permissionOverrides: [],
    facilities: [],
    activeFacilityId: null,
  };
  const record = { id: '1', name: 'Test' };

  it('wraps auth controller responses with explicit messages', async () => {
    const service = {
      register: jest.fn().mockResolvedValue(record),
      login: jest.fn().mockResolvedValue(record),
      forgotPassword: jest.fn().mockResolvedValue({ reset_url: 'url', reset_token: 'token' }),
      resetPassword: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(record),
      logout: jest.fn().mockResolvedValue(undefined),
      me: jest.fn().mockResolvedValue(record),
    };
    const controller = new AuthController(service as never);

    await expect(
      controller.register({ name: 'A', email: 'a@test.com', password: 'secret1' }),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.AUTH_REGISTERED,
      data: record,
    });
    await expect(
      controller.login({ email: 'a@test.com', password: 'secret1' }),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.AUTH_LOGGED_IN,
      data: record,
    });
    await expect(controller.forgotPassword({ email: 'a@test.com' })).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PASSWORD_RESET_REQUESTED,
    });
    await expect(
      controller.resetPassword({ token: 'token', password: 'secret1' }),
    ).resolves.toEqual({
      message: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESS,
      data: null,
    });
    await expect(controller.refresh({ refresh_token: 'refresh' })).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.AUTH_REFRESHED,
      data: record,
    });
    await expect(controller.logout({ refresh_token: 'refresh' })).resolves.toEqual({
      message: RESPONSE_MESSAGES.LOGGED_OUT,
      data: null,
    });
    await expect(controller.me(user as never)).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.AUTH_PROFILE_RETRIEVED,
      data: user,
    });
  });

  it('wraps user controllers responses with explicit messages', async () => {
    const service = {
      findById: jest.fn().mockResolvedValue(record),
      updateProfile: jest.fn().mockResolvedValue(record),
      findAll: jest.fn().mockResolvedValue({ users: [record], total: 1 }),
      create: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      createStaffProfile: jest.fn().mockResolvedValue({
        id: 'staff-1',
        employeeCode: 'ST260001',
      }),
    };
    const usersController = new UsersController(service as never);
    const managementController = new ManagementStaffsController(service as never);

    await expect(usersController.me(user as never)).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PROFILE_RETRIEVED,
    });
    await expect(
      usersController.updateMe(user as never, { name: 'Updated' }),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PROFILE_UPDATED,
    });
    await expect(managementController.findAll(user as never, {})).resolves.toMatchObject({
      message: 'Lấy danh sách nhân viên thành công.',
    });
    await expect(
      managementController.create(user as never, {
        name: 'A',
        personalEmail: 'a@test.com',
        phone: '+84900000000',
        facilityAssignments: [
          { facilityId: '1', roles: [RoleEnum.STAFF] },
        ],
      }),
    ).resolves.toMatchObject({
      message: 'Tạo nhân viên thành công.',
    });
    await expect(managementController.findOne(user as never, '1')).resolves.toMatchObject({
      message: 'Lấy thông tin nhân viên thành công.',
    });
    await expect(managementController.update(user as never, '1', { name: 'Updated' })).resolves.toMatchObject({
      message: 'Cập nhật nhân viên thành công.',
    });
    await expect(managementController.remove(user as never, '1')).resolves.toEqual({
      data: null,
      message: 'Đã khóa tài khoản nhân viên.',
    });
  });

  it('wraps role and permission controller responses with explicit messages', async () => {
    const roleService = {
      findAll: jest.fn().mockResolvedValue([record]),
      create: jest.fn().mockResolvedValue(record),
      findById: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const permissionService = { ...roleService };
    const rolesController = new RolesController(roleService as never);
    const permissionsController = new PermissionsController(permissionService as never);

    await expect(rolesController.findAll()).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.ROLES_RETRIEVED,
    });
    await expect(rolesController.create({ name: 'admin' })).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.ROLE_CREATED,
    });
    await expect(rolesController.findOne('1')).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.ROLE_RETRIEVED,
    });
    await expect(rolesController.update('1', { name: 'admin' })).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.ROLE_UPDATED,
    });
    await expect(rolesController.remove('1')).resolves.toEqual({
      message: RESPONSE_MESSAGES.ROLE_DELETED,
      data: null,
    });

    await expect(permissionsController.findAll()).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PERMISSIONS_RETRIEVED,
    });
    await expect(permissionsController.create({ name: 'user.view' })).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PERMISSION_CREATED,
    });
    await expect(permissionsController.findOne('1')).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PERMISSION_RETRIEVED,
    });
    await expect(permissionsController.update('1', { name: 'user.view' })).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PERMISSION_UPDATED,
    });
    await expect(permissionsController.remove('1')).resolves.toEqual({
      message: RESPONSE_MESSAGES.PERMISSION_DELETED,
      data: null,
    });
  });

  it('wraps settings, uploads, jobs, facilities, and rooms responses', async () => {
    const settingsService = {
      findPublic: jest.fn().mockResolvedValue({ site_name: 'Maternity Care' }),
      findAll: jest.fn().mockResolvedValue([record]),
      findByKey: jest.fn().mockResolvedValue(record),
      upsert: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
    };
    const uploadService = {
      createUserPresignedUpload: jest.fn().mockResolvedValue(record),
      createManagementPresignedUpload: jest.fn().mockResolvedValue(record),
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

    await expect(
      new SettingsController(settingsService as never).findPublic(),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.PUBLIC_SETTINGS_RETRIEVED,
    });
    await expect(
      new ManagementSettingsController(settingsService as never).findAll(),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.SETTINGS_RETRIEVED,
    });
    await expect(
      new UploadsController(uploadService as never).createPresignedUpload(
        user as never,
        {} as never,
      ),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.USER_UPLOAD_PRESIGN_CREATED,
    });
    await expect(
      new ManagementUploadsController(uploadService as never).createPresignedUpload({} as never),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.MANAGEMENT_UPLOAD_PRESIGN_CREATED,
    });
    await expect(
      new JobsController(jobsService as never).createTestJob({ message: 'hello' }),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.TEST_JOB_CREATED,
    });
    await expect(
      new FacilitiesController(facilitiesService as never).findAll(user as never, {}),
    ).resolves.toMatchObject({
      message: RESPONSE_MESSAGES.FACILITIES_RETRIEVED,
    });
    await expect(
      new RoomsController(roomsService as never).findAll(user as never, {}),
    ).resolves.toMatchObject({
      message: 'Lấy danh sách phòng thành công',
    });
    await expect(
      new RoomsFacilityController(roomsService as never).findRoomsByFacility(
        user as never,
        '1',
        {},
      ),
    ).resolves.toMatchObject({
      message: 'Lấy danh sách phòng theo cơ sở thành công',
    });
  });
});
