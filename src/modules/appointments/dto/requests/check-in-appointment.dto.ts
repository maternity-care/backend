import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const BIGINT_ID_PATTERN = /^[1-9]\d*$/;

export class CheckInAppointmentDto {
  @ApiProperty({ example: '2' })
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  pregnancyProfileId: string;

  @ApiPropertyOptional({ description: 'Doctor entity id if staff changes doctor before check-in' })
  @IsOptional()
  @IsString()
  @Matches(BIGINT_ID_PATTERN)
  doctorId?: string;
}
