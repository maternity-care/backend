import { DeepPartial } from 'typeorm';
import { User } from '../entities/user.entity';
import { SearchUserDto } from '../dto/request/search-user.dto';
import { SearchUserResponseDto } from '../dto/response/search-user-response.dto';
import { AccountStatus } from '../../../common/constants/status.enum';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface IUsersRepository {
  create(data: DeepPartial<User>): User;
  save(user: User): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  updateStatus(id: string, status: AccountStatus): Promise<void>;
  checkPhoneExists(phone: string): Promise<boolean>;
  searchUsers(query: SearchUserDto): Promise<SearchUserResponseDto>;
}
