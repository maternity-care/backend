import { StaffPermission } from './../../../permissions/entities/staff-permission.entity';
import { AccountStatus } from './../../../../common/constants/status.enum';
import { Facility } from './../../../facilities/entities/facility.entity';
import { Role } from './../../../roles/entities/role.entity';
import { Doctor } from './../../../doctors/entities/doctor.entity';
import { ApiProperty } from '@nestjs/swagger';
export class SafeStaffDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  doctor: Doctor | null;

  @ApiProperty()
  roles: Role[];

  @ApiProperty()
  facility: Facility;

  @ApiProperty()
  name: string;

  @ApiProperty()
  personalEmail: string;

  @ApiProperty()
  employeeCode: string;

  @ApiProperty()
  facilityId: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  status: AccountStatus;

  @ApiProperty()
  permissions: StaffPermission[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
