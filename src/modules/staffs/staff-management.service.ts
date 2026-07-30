import { Inject, Injectable } from '@nestjs/common';
import { AccountStatus } from '../../common/constants/status.enum';
import { parseSearch } from '../../common/helpers/search-builder';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdminCreateUserDto } from '../users/dto/request/admin-create-user.dto';
import { SearchUserDto } from '../users/dto/request/search-user.dto';
import { UpdateUserDto } from '../users/dto/request/update-user.dto';
import { SearchUserResponseDto } from '../users/dto/response/search-user-response.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import {
  IStaffProfileRepository,
  STAFF_PROFILE_REPOSITORY,
} from './interfaces/staff-profile-repository.interface';

@Injectable()
export class StaffManagementService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(STAFF_PROFILE_REPOSITORY)
    private readonly staffProfileRepository: IStaffProfileRepository,
  ) {}

  async findAll(query: SearchUserDto): Promise<SearchUserResponseDto> {
    const searchFilters = parseSearch(query.search);
    const searchValue = (field: string) =>
      searchFilters.find((filter) => filter.field === field)?.values[0]?.trim();

    const keyword = searchValue('keyword') || query.name || query.email || query.phone || query.cccd;
    const role = searchValue('role');
    const roleId = searchValue('roleId') || query.roleId;
    const facilityId = searchValue('facilityId') || query.facilityId;
    const status = searchValue('status') || query.status;
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const normalizedRole = role?.trim().toLowerCase();
    const normalizedRoleId = roleId?.trim();
    const normalizedFacilityId = facilityId?.trim();

    const staffs = await this.staffProfileRepository.findAll();
    const filteredStaffs = staffs.filter((staff) => {
      if (status && staff.status !== status) return false;
      if (normalizedFacilityId && String(staff.facilityId) !== normalizedFacilityId) return false;
      if (
        normalizedKeyword &&
        ![staff.name, staff.email, staff.personalEmail, staff.phone, staff.employeeCode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedKeyword))
      ) {
        return false;
      }
      if (
        normalizedRole &&
        !(staff.roles ?? []).some((staffRole) => staffRole.name.toLowerCase() === normalizedRole)
      ) {
        return false;
      }
      if (
        normalizedRoleId &&
        !(staff.roles ?? []).some((staffRole) => String(staffRole.id) === normalizedRoleId)
      ) {
        return false;
      }
      return true;
    });

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    return {
      users: filteredStaffs.slice(offset, offset + limit) as unknown as User[],
      total: filteredStaffs.length,
    };
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

  updateStatus(id: string, status: AccountStatus, actor: AuthenticatedUser) {
    return this.usersService.updateUserStatus(id, status, actor);
  }
}
