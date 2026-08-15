import { ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsOptional, IsString, Validate } from 'class-validator';
import { UserStatusEnum } from '../../users.enum';

export class UpdatePregnantUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar?: string;

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

  @ApiPropertyOptional({
    enum: [UserStatusEnum.ACTIVE],
    nullable: true,
  })
  @Equals(UserStatusEnum.ACTIVE)
  @IsOptional()
  status?: UserStatusEnum.ACTIVE | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}
