import { AccountStatus } from '../constants/status.enum';
import { PermissionEnum } from '../constants/permission.enum';
import { RoleEnum } from '../constants/role.enum';
import { checkPermission } from './auth.helper';

describe('checkPermission', () => {
  it('allows every permission for super admin', () => {
    expect(checkPermission({
      id: '1', name: 'Root', email: 'root@example.com',
      status: AccountStatus.ACTIVE,
      roles: [{ id: '1', name: RoleEnum.SUPER_ADMIN, permissions: [] }],
      permissionOverrides: [], facilities: [], facilityRole: null,
      facilityRoles: [], activeFacilityId: null,
    }, PermissionEnum.DOCTOR_DELETE)).toBe(true);
  });
});
