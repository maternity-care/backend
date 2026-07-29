import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, Max, Min } from 'class-validator';

export class SearchDoctorDto {
  @ApiPropertyOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  licenseNo?: string;

  @ApiPropertyOptional()
  @IsString()
  specialtyId?: string;

  @ApiPropertyOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsNumber()
  sortYearsOfExperience?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  page?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
