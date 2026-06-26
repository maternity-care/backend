import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Time } from 'bullmq/dist/esm/interfaces/telemetry';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateFacilityDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+?\d{7,15})$/, {
    message: 'Số điện thoại không hợp lệ. Vui lòng nhập 7-15 chữ số và có thể bắt đầu bằng +.',
  })
  phone: string;

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
    
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ward: string;

  @ApiPropertyOptional({ type: String, description: 'Latitude as decimal string' })
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiPropertyOptional({ type: String, description: 'Longitude as decimal string' })
  @IsString()
  @IsOptional()
  longitude?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status: string;
}
