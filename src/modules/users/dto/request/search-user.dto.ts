import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { AccountStatus } from '../../../../common/constants/status.enum';

export class SearchUserDto {
  @ApiPropertyOptional({
    description: 'Shared search syntax, e.g. keyword=*an|status=active',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sort?: 'ASC' | 'DESC';
}
