import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsString } from 'class-validator';
import { RoleEnum } from '../../../../common/constants/role.enum';
import { STAFF_POSITION_ROLES } from './create-staff-profile.dto';

export class FacilityStaffAssignmentDto {
  @ApiProperty()
  @IsString()
  facilityId: string;

  @ApiProperty({ enum: STAFF_POSITION_ROLES, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(STAFF_POSITION_ROLES, { each: true })
  roles: Array<RoleEnum.ADMIN | RoleEnum.DOCTOR | RoleEnum.NURSE | RoleEnum.STAFF>;
}
