import { ForbiddenException } from '@nestjs/common';
import { FacilityStatus } from '../constants/status.enum';
import { RESPONSE_MESSAGES } from '../constants/response-message.constant';
import { RoleEnum } from '../constants/role.enum';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

export function isSuperAdmin(user: AuthenticatedUser): boolean {
  return user.roles.some((role) => role.name === RoleEnum.SUPER_ADMIN);
}

export function getActiveFacilityId(user: AuthenticatedUser): string | null {
  return requireActiveFacilityId(user);
}

/**
 * Returns the selected facility for operational staff.
 * Super admins are intentionally unscoped and therefore receive null.
 */
export function requireActiveFacilityId(
  user: AuthenticatedUser,
): string | null {
  if (isSuperAdmin(user)) {
    return null;
  }

  const facilityId = user.activeFacilityId;
  const assignedFacility = user.facilities.find(
    (facility) =>
      String(facility.id) === String(facilityId) &&
      facility.status === FacilityStatus.ACTIVE &&
      (facility.roles?.length ?? 0) > 0,
  );

  if (!facilityId || !assignedFacility) {
    throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_ASSIGNMENT_INVALID);
  }

  return String(facilityId);
}

export function assertFacilityAccess(
  user: AuthenticatedUser,
  facilityId: string,
): void {
  if (isSuperAdmin(user)) {
    return;
  }

  const activeFacilityId = requireActiveFacilityId(user);
  if (String(activeFacilityId) !== String(facilityId)) {
    throw new ForbiddenException(RESPONSE_MESSAGES.FACILITY_ACCESS_DENIED);
  }
}
