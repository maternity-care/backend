import { ApiPropertyOptional } from '@nestjs/swagger';
import { Time } from 'bullmq/dist/esm/interfaces/telemetry';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { FacilityStatus } from '../../../../common/constants/status.enum';

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
  @Matches(/^(\+?\d{7,15})$/, {
    message: 'Số điện thoại không hợp lệ. Vui lòng nhập 7-15 chữ số và có thể bắt đầu bằng +.',
  })
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

      @ApiPropertyOptional()
      @IsString()
      @IsOptional()
      open_time?: Time;
    
      @ApiPropertyOptional()
      @IsString()
      @IsOptional()
      close_time?: Time;
    
      @ApiPropertyOptional()
      @IsString()
      @IsOptional()
      working_days?: string;

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

  @ApiPropertyOptional({ enum: FacilityStatus })
  @IsEnum(FacilityStatus)
  @IsOptional()
  status?: FacilityStatus;
}
