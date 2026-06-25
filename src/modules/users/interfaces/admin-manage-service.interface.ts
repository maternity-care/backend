import { AdminCreateUserDto } from '../dto/request/admin-create-user.dto';
import { SearchUserDto } from '../dto/request/search-user.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import { SearchUserResponseDto } from '../dto/response/search-user-response.dto';
import { User } from '../entities/user.entity';

export interface IAdminManageService {
  findAllUsers(query: SearchUserDto): Promise<SearchUserResponseDto>;
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(dto: AdminCreateUserDto): Promise<User>;
  updateUser(id: string, dto: UpdateUserDto): Promise<User>;
  updateUserStatus(id: string, status: number): Promise<void>;
  searchUsers(query: SearchUserDto): Promise<SearchUserResponseDto>;
}
