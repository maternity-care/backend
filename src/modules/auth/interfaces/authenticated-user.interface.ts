export interface AuthenticatedPermission {
  id: string;
  name: string;
}

export interface AuthenticatedRole {
  id: string;
  name: string;
  permissions: AuthenticatedPermission[];
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  status: number;
  roles: AuthenticatedRole[];
}
