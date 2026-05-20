import { DeepPartial } from 'typeorm';
import { User } from '../entities/user.entity';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface IUsersRepository {
  create(data: DeepPartial<User>): User;
  save(user: User): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  remove(user: User): Promise<void>;
}
