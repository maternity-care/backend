import { ForbiddenException } from '@nestjs/common';
import { AccountStatus, FacilityStatus } from '../constants/status.enum';
import { RoleEnum } from '../constants/role.enum';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';
import {
  assertFacilityAccess,
  requireActiveFacilityId,
} from './facility-scope.helper';

function user(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: '10',
    name: 'Staff',
    email: 'staff@example.com',
    status: AccountStatus.ACTIVE,
    roles: [],
    permissionOverrides: [],
    facilities: [{
      id: '2',
      name: 'Facility 2',
      code: 'F2',
      status: FacilityStatus.ACTIVE,
      role: { id: '3', name: RoleEnum.STAFF, permissions: [] },
      roles: [{ id: '3', name: RoleEnum.STAFF, permissions: [] }],
    }],
    facilityRole: { id: '3', name: RoleEnum.STAFF, permissions: [] },
    facilityRoles: [{ id: '3', name: RoleEnum.STAFF, permissions: [] }],
    activeFacilityId: '2',
    ...overrides,
  };
}

describe('facility scope', () => {
  it('allows an active assignment at the selected facility', () => {
    expect(requireActiveFacilityId(user())).toBe('2');
    expect(() => assertFacilityAccess(user(), '2')).not.toThrow();
  });

  it('rejects a different facility', () => {
    expect(() => assertFacilityAccess(user(), '9')).toThrow(ForbiddenException);
  });

  it('rejects stale or inactive assignments', () => {
    expect(() => requireActiveFacilityId(user({ facilities: [] }))).toThrow(
      ForbiddenException,
    );
    const inactive = user();
    inactive.facilities[0].status = FacilityStatus.INACTIVE;
    expect(() => requireActiveFacilityId(inactive)).toThrow(ForbiddenException);
  });

  it('does not scope a super admin', () => {
    const superAdmin = user({
      roles: [{ id: '1', name: RoleEnum.SUPER_ADMIN, permissions: [] }],
      facilities: [],
      activeFacilityId: null,
    });
    expect(requireActiveFacilityId(superAdmin)).toBeNull();
    expect(() => assertFacilityAccess(superAdmin, '999')).not.toThrow();
  });
});
