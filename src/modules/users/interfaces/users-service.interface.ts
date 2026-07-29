import { UpdateProfileDto } from '../dto/request/update-profile.dto';
import { UpdatePregnantUserDto } from '../dto/request/update-pregnant-user.dto';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/request/create-user.dto';

export const USERS_SERVICE = Symbol('USERS_SERVICE');

export interface IUsersService {
  create(dto: CreateUserDto): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  updateProfile(id: string, dto: UpdateProfileDto): Promise<User>;
  update(id: string, dto: UpdatePregnantUserDto): Promise<User>;
}
