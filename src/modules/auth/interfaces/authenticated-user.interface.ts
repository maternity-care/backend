import { AccountStatus } from '../../../common/constants/status.enum';

export interface AuthenticatedPermission {
  id: string;
  name: string;
}

export interface AuthenticatedRole {
  id: string;
  name: string;
  permissions: AuthenticatedPermission[];
}

export interface AuthenticatedPermissionOverride {
  permission: AuthenticatedPermission;
  effect: 'allow' | 'deny';
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  personalEmail?: string;
  employeeCode?: string;
  status: AccountStatus;
  roles: AuthenticatedRole[];
  permissionOverrides: AuthenticatedPermissionOverride[];
  facilities: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    role: AuthenticatedRole;
    roles: AuthenticatedRole[];
  }>;
  facilityRole: AuthenticatedRole | null;
  facilityRoles: AuthenticatedRole[];
  activeFacilityId: string | null;
}
