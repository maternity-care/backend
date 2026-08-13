import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';

export class DoctorShiftResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  doctorId?: string | null;

  @ApiPropertyOptional()
  staffId?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  roleId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  slotId?: string | null;

  @ApiProperty()
  facilityId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  roomId: string | null;

  @ApiProperty()
  shiftDate: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  maxAppointments: number | null;

  @ApiProperty({ type: Number, example: 3 })
  bookedAppointments: number;

  @ApiProperty({ enum: DoctorShiftStatus })
  status: DoctorShiftStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  staffName?: string;

  @ApiPropertyOptional()
  roleName?: string;

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

  @ApiPropertyOptional({ type: String, nullable: true })
  roomName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  roomType?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  roomTypeId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  roomTypeName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  slotCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  slotName?: string | null;
}

export class GroupedShiftItemResponseDto extends DoctorShiftResponseDto {
  @ApiProperty({ example: 'MON' })
  workingDay: string;
}

export class DoctorShiftGroupResponseDto {
  @ApiProperty()
  groupIndex: number;

  @ApiProperty({ type: [String], example: ['MON', 'WED'] })
  workingDays: string[];

  @ApiProperty({ type: [GroupedShiftItemResponseDto] })
  shifts: GroupedShiftItemResponseDto[];
}

export class GroupedDoctorShiftResponseDto {
  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  dateFrom: string;

  @ApiProperty()
  dateTo: string;

  @ApiProperty()
  totalShifts: number;

  @ApiProperty()
  totalGroups: number;

  @ApiProperty({ type: [DoctorShiftGroupResponseDto] })
  groups: DoctorShiftGroupResponseDto[];
}

export class DoctorShiftPaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [DoctorShiftResponseDto] })
  items: DoctorShiftResponseDto[];
}
