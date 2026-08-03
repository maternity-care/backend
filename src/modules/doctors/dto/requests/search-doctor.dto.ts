import { ActiveStatus } from './../../../../common/constants/status.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
    description: 'Filter by years of experience, level 1-(1-5),2-(6-10),3-(11-20),4-(>20)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(4)
  filterYearsOfExperienceLevel?: number;

  @ApiPropertyOptional({
    description: 'Sort by years of experience asc or desc, default is desc',
  })
  @IsString()
  @IsOptional()
  sortYearsOfExperience?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number = 1;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
