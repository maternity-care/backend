import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';

export class DoctorShiftResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  doctorId: string;

  @ApiPropertyOptional()
  staffId?: string;

  @ApiPropertyOptional({ nullable: true })
  slotId?: string | null;

  @ApiProperty()
  facilityId: string;

  @ApiPropertyOptional({ nullable: true })
  roomId: string | null;

  @ApiProperty()
  shiftDate: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiPropertyOptional({ nullable: true })
  maxAppointments: number | null;

  @ApiProperty({ enum: DoctorShiftStatus })
  status: DoctorShiftStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  doctorName?: string;

  @ApiPropertyOptional()
  doctorTitle?: string;

  @ApiPropertyOptional()
  doctorSpecialty?: string;

  @ApiPropertyOptional()
  facilityCode?: string;

  @ApiPropertyOptional()
  facilityName?: string;

  @ApiPropertyOptional({ nullable: true })
  roomName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  roomType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  roomTypeId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  roomTypeName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  slotCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  slotName?: string | null;
}
