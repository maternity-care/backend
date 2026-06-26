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
import { ManagementUsersController } from './users/management-users.controller';
import { UsersController } from './users/users.controller';

describe('module controllers', () => {
  const user = { id: '1' };
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
      message: 'Registered successfully',
      data: record,
    });
    await expect(
      controller.login({ email: 'a@test.com', password: 'secret1' }),
    ).resolves.toMatchObject({
      message: 'Logged in successfully',
      data: record,
    });
    await expect(controller.forgotPassword({ email: 'a@test.com' })).resolves.toMatchObject({
      message: 'Password reset instructions have been generated',
    });
    await expect(
      controller.resetPassword({ token: 'token', password: 'secret1' }),
    ).resolves.toEqual({
      message: 'Password reset successfully',
      data: null,
    });
    await expect(controller.refresh({ refresh_token: 'refresh' })).resolves.toMatchObject({
      message: 'Token refreshed successfully',
      data: record,
    });
    await expect(controller.logout({ refresh_token: 'refresh' })).resolves.toEqual({
      message: 'Logged out successfully',
      data: null,
    });
    await expect(controller.me(user as never)).resolves.toMatchObject({
      message: 'Authenticated profile retrieved successfully',
      data: record,
    });
  });

  it('wraps user controllers responses with explicit messages', async () => {
    const service = {
      findById: jest.fn().mockResolvedValue(record),
      updateProfile: jest.fn().mockResolvedValue(record),
      findAllUsers: jest.fn().mockResolvedValue({ data: [record], total: 1 }),
      createUser: jest.fn().mockResolvedValue(record),
      findUserById: jest.fn().mockResolvedValue(record),
      updateUser: jest.fn().mockResolvedValue(record),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const usersController = new UsersController(service as never);
    const managementController = new ManagementUsersController(service as never);

    await expect(usersController.me(user as never)).resolves.toMatchObject({
      message: 'Profile retrieved successfully',
    });
    await expect(
      usersController.updateMe(user as never, { name: 'Updated' }),
    ).resolves.toMatchObject({
      message: 'Profile updated successfully',
    });
    await expect(managementController.findAll({})).resolves.toMatchObject({
      message: 'Lấy danh sách người dùng thành công.',
    });
    await expect(
      managementController.create({
        name: 'A',
        personalEmail: 'a@test.com',
        phone: '+84900000000',
        position: 'Staff',
      }),
    ).resolves.toMatchObject({
      message: 'Tạo người dùng thành công.',
    });
    await expect(managementController.findOne('1')).resolves.toMatchObject({
      message: 'Lấy thống tin người dùng thành công.',
    });
    await expect(managementController.update('1', { name: 'Updated' })).resolves.toMatchObject({
      message: 'Cập nhật thông tin người dùng thành công.',
    });
    await expect(managementController.remove('1')).resolves.toEqual({
      success: true,
      message: 'Đã xóa mềm thông tin người dùng.',
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
      message: 'Roles retrieved successfully',
    });
    await expect(rolesController.create({ name: 'admin' })).resolves.toMatchObject({
      message: 'Role created successfully',
    });
    await expect(rolesController.findOne('1')).resolves.toMatchObject({
      message: 'Role retrieved successfully',
    });
    await expect(rolesController.update('1', { name: 'admin' })).resolves.toMatchObject({
      message: 'Role updated successfully',
    });
    await expect(rolesController.remove('1')).resolves.toEqual({
      message: 'Role deleted successfully',
      data: null,
    });

    await expect(permissionsController.findAll()).resolves.toMatchObject({
      message: 'Permissions retrieved successfully',
    });
    await expect(permissionsController.create({ name: 'user.view' })).resolves.toMatchObject({
      message: 'Permission created successfully',
    });
    await expect(permissionsController.findOne('1')).resolves.toMatchObject({
      message: 'Permission retrieved successfully',
    });
    await expect(permissionsController.update('1', { name: 'user.view' })).resolves.toMatchObject({
      message: 'Permission updated successfully',
    });
    await expect(permissionsController.remove('1')).resolves.toEqual({
      message: 'Permission deleted successfully',
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
      message: 'Public settings retrieved successfully',
    });
    await expect(
      new ManagementSettingsController(settingsService as never).findAll(),
    ).resolves.toMatchObject({
      message: 'Settings retrieved successfully',
    });
    await expect(
      new UploadsController(uploadService as never).createPresignedUpload(
        user as never,
        {} as never,
      ),
    ).resolves.toMatchObject({
      message: 'User presigned upload URL created successfully',
    });
    await expect(
      new ManagementUploadsController(uploadService as never).createPresignedUpload({} as never),
    ).resolves.toMatchObject({
      message: 'Management presigned upload URL created successfully',
    });
    await expect(
      new JobsController(jobsService as never).createTestJob({ message: 'hello' }),
    ).resolves.toMatchObject({
      message: 'Test job created successfully',
    });
    await expect(
      new FacilitiesController(facilitiesService as never).findAll({}),
    ).resolves.toMatchObject({
      message: 'Lấy danh sách cơ sở thành công',
    });
    await expect(new RoomsController(roomsService as never).findAll()).resolves.toMatchObject({
      message: 'Lấy danh sách phòng thành công',
    });
    await expect(
      new RoomsFacilityController(roomsService as never).findRoomsByFacility('1', {}),
    ).resolves.toMatchObject({
      message: 'Lấy danh sách phòng theo cơ sở thành công',
    });
  });
});
