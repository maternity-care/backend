import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsOptional, IsString } from 'class-validator';

export class UpdateFacilityDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

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
  district?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ type: String, description: 'Latitude as decimal string' })
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiPropertyOptional({ type: String, description: 'Longitude as decimal string' })
  @IsString()
  @IsOptional()
  longitude?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}
