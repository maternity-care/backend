export interface JwtPayload {
  sub: string;
  email: string;
  accountType: 'user' | 'staff';
}
