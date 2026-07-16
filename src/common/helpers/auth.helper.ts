import { UnauthorizedException } from '@nestjs/common';
import { PermissionEnum } from '../constants/permission.enum';
import { RoleEnum } from '../constants/role.enum';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

export function checkAuth(user?: AuthenticatedUser): AuthenticatedUser {
  if (!user) {
    throw new UnauthorizedException('Authentication is required');
  }

  return user;
}

export function getUserRoles(user: AuthenticatedUser): string[] {
  return [
    ...user.roles.map((role) => role.name),
    ...(user.facilityRoles ?? []).map((role) => role.name),
  ];
}

export function getUserPermissions(user: AuthenticatedUser): string[] {
  const rolePermissions = user.roles.flatMap((role) =>
    role.permissions.map((permission) => permission.name),
  );
  const facilityPermissions = (user.facilityRoles ?? []).flatMap((role) =>
    role.permissions.map((permission) => permission.name),
  );
  const allowedOverrides = (user.permissionOverrides ?? [])
    .filter((permissionOverride) => permissionOverride.effect === 'allow')
    .map((permissionOverride) => permissionOverride.permission.name);
  const deniedOverrides = new Set(
    (user.permissionOverrides ?? [])
      .filter((permissionOverride) => permissionOverride.effect === 'deny')
      .map((permissionOverride) => permissionOverride.permission.name),
  );

  return Array.from(
    new Set([...rolePermissions, ...facilityPermissions, ...allowedOverrides]),
  ).filter(
    (permissionName) => !deniedOverrides.has(permissionName),
  );
}

export function checkRole(user: AuthenticatedUser, roleName: RoleEnum): boolean {
  return getUserRoles(user).includes(roleName);
}

export function checkPermission(user: AuthenticatedUser, permissionName: PermissionEnum): boolean {
  if (checkRole(user, RoleEnum.SUPER_ADMIN)) {
    return true;
  }
  return getUserPermissions(user).includes(permissionName);
}
