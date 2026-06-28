import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { UserPermissionOverrideDto } from './user-permission-override.dto';
import { Type } from 'class-transformer';
import { RoleEnum } from '../../../../common/constants/role.enum';
import { FacilityStaffAssignmentDto } from './facility-staff-assignment.dto';

export class AdminCreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  personalEmail: string;

  @ApiProperty()
  @IsString()
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'phone phải là số điện thoại di động Việt Nam hợp lệ.',
  })
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @ApiProperty({ type: [FacilityStaffAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacilityStaffAssignmentDto)
  facilityAssignments: FacilityStaffAssignmentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  licenseNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  specialty?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ type: [UserPermissionOverrideDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionOverrideDto)
  @IsOptional()
  permissionOverrides?: UserPermissionOverrideDto[];
}
