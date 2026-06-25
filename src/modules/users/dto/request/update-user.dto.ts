import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserPermissionOverrideDto } from './user-permission-override.dto';

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
  @IsPhoneNumber()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleIds?: string[];

  @ApiPropertyOptional({ type: [UserPermissionOverrideDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionOverrideDto)
  @IsOptional()
  permissionOverrides?: UserPermissionOverrideDto[];
}
