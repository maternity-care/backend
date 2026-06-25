import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateProfileDto } from '../dto/request/update-profile.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import { User } from '../entities/user.entity';

export const USERS_SERVICE = Symbol('USERS_SERVICE');

export interface IUsersService {
  create(dto: CreateUserDto): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  updateProfile(id: string, dto: UpdateProfileDto): Promise<User>;
  update(id: string, dto: UpdateUserDto): Promise<User>;
}
