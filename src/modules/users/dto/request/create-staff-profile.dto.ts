import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleEnum } from '../../../../common/constants/role.enum';

export const STAFF_POSITION_ROLES = [
  RoleEnum.ADMIN,
  RoleEnum.DOCTOR,
  RoleEnum.NURSE,
  RoleEnum.STAFF,
] as const;

export class CreateStaffProfileDto {
  @ApiProperty()
  @IsEmail()
  personalEmail: string;

  @ApiProperty({ enum: STAFF_POSITION_ROLES })
  @IsIn(STAFF_POSITION_ROLES)
  position: RoleEnum.ADMIN | RoleEnum.DOCTOR | RoleEnum.NURSE | RoleEnum.STAFF;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  facilityIds: string[];

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateStaffProfileDto) => dto.position === RoleEnum.DOCTOR)
  @IsString()
  @IsNotEmpty()
  licenseNo?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateStaffProfileDto) => dto.position === RoleEnum.DOCTOR)
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateStaffProfileDto) => dto.position === RoleEnum.DOCTOR)
  @IsString()
  @IsNotEmpty()
  specialty?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @ValidateIf((dto: CreateStaffProfileDto) => dto.position === RoleEnum.DOCTOR)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string;
}
