import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../common/constants/status.enum';

export class AppointmentResponseDto {
  @ApiProperty({ example: '21' })
  id: string;

  @ApiProperty({ example: '2' })
  patientId: string;

  @ApiPropertyOptional({ example: '2', nullable: true })
  pregnancyProfileId: string | null;

  @ApiProperty({ example: '900091' })
  facilityId: string;

  @ApiProperty({ example: '900491' })
  serviceId: string;

  @ApiProperty({ example: '900018' })
  doctorId: string;

  @ApiProperty({ example: '900147' })
  roomId: string;

  @ApiProperty({ example: '2026-07-30 08:00:00' })
  scheduledStart: string;

  @ApiProperty({ example: '2026-07-30 08:30:00' })
  scheduledEnd: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;
}
