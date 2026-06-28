import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Time } from 'bullmq';
import { FacilityStatus } from '../../../../common/constants/status.enum';

export class FacilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  open_time?: Time;

  @ApiPropertyOptional()
  close_time?: Time;

  @ApiPropertyOptional()
  working_days?: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  district: string;

  @ApiProperty()
  ward: string;

  @ApiPropertyOptional()
  latitude?: string;

  @ApiPropertyOptional()
  longitude?: string;

  @ApiProperty()
  status: FacilityStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
