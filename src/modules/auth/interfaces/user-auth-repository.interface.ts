import { DeepPartial } from 'typeorm';
import { UserAuth } from '../entities/user-auth.entity';

export const USER_AUTH_REPOSITORY = Symbol('USER_AUTH_REPOSITORY');
export interface IUserAuthRepository {
  findById(id: string): Promise<UserAuth | null>;
  findByEmail(email: string): Promise<UserAuth | null>;
  create(data: DeepPartial<UserAuth>): Promise<UserAuth>;
  save(userAuth: UserAuth): Promise<UserAuth>;
  update(id: string, email: string, password: string): Promise<void>;
}
