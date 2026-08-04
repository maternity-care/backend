import { DoctorShiftStatus } from '../../../common/constants/status.enum';
import { RoleEnum } from '../../../common/constants/role.enum';

export interface ShiftRolePolicy {
  requiresDoctorProfile: boolean;
  requiresRoom: boolean;
  occupiesPrimaryRoom: boolean;
  bookableForAppointments: boolean;
}

const DEFAULT_STAFF_POLICY: ShiftRolePolicy = {
  requiresDoctorProfile: false,
  requiresRoom: false,
  occupiesPrimaryRoom: false,
  bookableForAppointments: false,
};

const DOCTOR_POLICY: ShiftRolePolicy = {
  requiresDoctorProfile: true,
  requiresRoom: true,
  occupiesPrimaryRoom: true,
  bookableForAppointments: true,
};

const ROLE_POLICIES: Partial<Record<RoleEnum, ShiftRolePolicy>> = {
  [RoleEnum.DOCTOR]: DOCTOR_POLICY,
  [RoleEnum.NURSE]: {
    requiresDoctorProfile: false,
    requiresRoom: false,
    occupiesPrimaryRoom: false,
    bookableForAppointments: false,
  },
  [RoleEnum.STAFF]: DEFAULT_STAFF_POLICY,
  [RoleEnum.MODERATOR]: DEFAULT_STAFF_POLICY,
  [RoleEnum.ADMIN]: DEFAULT_STAFF_POLICY,
  [RoleEnum.SUPER_ADMIN]: DEFAULT_STAFF_POLICY,
  [RoleEnum.MEMBER]: DEFAULT_STAFF_POLICY,
  [RoleEnum.PARTNER]: DEFAULT_STAFF_POLICY,
};

export const PRIMARY_ROOM_ROLE_NAMES = [RoleEnum.DOCTOR];

export function getShiftRolePolicy(roleName?: string | null): ShiftRolePolicy {
  if (!roleName) {
    return DOCTOR_POLICY;
  }

  const normalizedRoleName = roleName.trim().toLowerCase() as RoleEnum;
  return ROLE_POLICIES[normalizedRoleName] ?? DEFAULT_STAFF_POLICY;
}

export function roleRequiresRoom(roleName?: string | null, status?: DoctorShiftStatus): boolean {
  if (status === DoctorShiftStatus.OFF || status === DoctorShiftStatus.CANCELLED) {
    return false;
  }

  return getShiftRolePolicy(roleName).requiresRoom;
}

export function roleOccupiesPrimaryRoom(roleName?: string | null, status?: DoctorShiftStatus): boolean {
  if (status === DoctorShiftStatus.OFF || status === DoctorShiftStatus.CANCELLED) {
    return false;
  }

  return getShiftRolePolicy(roleName).occupiesPrimaryRoom;
}
