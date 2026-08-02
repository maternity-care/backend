import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../common/constants/status.enum';

export class ManagementAppointmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  patientId: string;

  @ApiPropertyOptional()
  patientName?: string;

  @ApiPropertyOptional()
  patientPhone?: string;

  @ApiPropertyOptional()
  patientEmail?: string;

  @ApiPropertyOptional({ nullable: true })
  pregnancyProfileId: string | null;

  @ApiPropertyOptional({ nullable: true })
  pregnancyProfileCode?: string | null;

  @ApiProperty()
  facilityId: string;

  @ApiPropertyOptional()
  facilityName?: string;

  @ApiProperty()
  serviceId: string;

  @ApiPropertyOptional()
  serviceName?: string;

  @ApiPropertyOptional({ nullable: true })
  doctorId: string | null;

  @ApiPropertyOptional({ nullable: true })
  doctorStaffId: string | null;

  @ApiPropertyOptional()
  doctorName?: string;

  @ApiPropertyOptional()
  doctorTitle?: string;

  @ApiProperty()
  roomId: string;

  @ApiPropertyOptional()
  roomName?: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;
}
