import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserPermissionOverrideDto } from './user-permission-override.dto';
import { FacilityStaffAssignmentDto } from './facility-staff-assignment.dto';
import { AccountStatus } from '../../../../common/constants/status.enum';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'phone phải là số điện thoại di động Việt Nam hợp lệ.',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @ApiPropertyOptional({ type: [FacilityStaffAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacilityStaffAssignmentDto)
  @IsOptional()
  facilityAssignments?: FacilityStaffAssignmentDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  licenseNo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
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
