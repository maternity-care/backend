import { User } from '../../users/entities/user.entity';
export interface IUserAuthServiceInterface {
  findByEmail(email: string): Promise<User | null>;
  register(email: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<User | null>;
  logout(email: string): Promise<void>;
  updatePassword(email: string, password: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
}
