import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { UserStatusEnum } from '../../users.enum';

export class UpdatePregnantUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @Validate((value: string) => {
    if (new Date(value).getTime() + 15 * 365 * 24 * 60 * 60 * 1000 > new Date().getTime()) {
    }
    return false;
  })
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status: UserStatusEnum.ACTIVE | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}
