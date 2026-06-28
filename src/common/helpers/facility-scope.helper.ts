import { ForbiddenException } from '@nestjs/common';
import { RoleEnum } from '../constants/role.enum';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

export function isSuperAdmin(user: AuthenticatedUser): boolean {
  return user.roles.some((role) => role.name === RoleEnum.SUPER_ADMIN);
}

export function getActiveFacilityId(user: AuthenticatedUser): string | null {
  return isSuperAdmin(user) ? null : user.activeFacilityId;
}

export function assertFacilityAccess(
  user: AuthenticatedUser,
  facilityId: string,
): void {
  if (!isSuperAdmin(user) && String(user.activeFacilityId) !== String(facilityId)) {
    throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu của cơ sở này.');
  }
}
