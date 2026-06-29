import { Injectable } from '@nestjs/common';
import { AccountStatus } from '../../common/constants/status.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdminCreateUserDto } from '../users/dto/request/admin-create-user.dto';
import { SearchUserDto } from '../users/dto/request/search-user.dto';
import { UpdateUserDto } from '../users/dto/request/update-user.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class StaffManagementService {
  constructor(private readonly usersService: UsersService) {}

  findAll(query: SearchUserDto, actor: AuthenticatedUser) {
    return this.usersService.findAllUsers(query, actor);
  }

  findById(id: string, actor: AuthenticatedUser) {
    return this.usersService.findUserById(id, actor);
  }

  create(dto: AdminCreateUserDto, actor: AuthenticatedUser) {
    return this.usersService.createUser(dto, actor);
  }

  update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    return this.usersService.updateUser(id, dto, actor);
  }

  updateStatus(
    id: string,
    status: AccountStatus,
    actor: AuthenticatedUser,
  ) {
    return this.usersService.updateUserStatus(id, status, actor);
  }
}
