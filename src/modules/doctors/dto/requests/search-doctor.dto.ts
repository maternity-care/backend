import { ActiveStatus } from './../../../../common/constants/status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchDoctorDto {
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
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  licenseNo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ enum: ActiveStatus, description: 'active or inactive' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Sort by years of experience asc or desc, default is desc',
  })
  @IsString()
  @IsOptional()
  sortYearsOfExperience?: 'ASC' | 'DESC';

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}
