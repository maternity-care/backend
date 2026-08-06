import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorShiftStatus } from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';

export class DoctorShiftResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  doctorId?: string | null;

  @ApiPropertyOptional()
  staffId?: string;

  @ApiPropertyOptional({ nullable: true })
  roleId?: string | null;

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

  @ApiPropertyOptional({ nullable: true })
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

export class GroupedShiftItemResponseDto extends DoctorShiftResponseDto {
  @ApiProperty({ example: 'MON' })
  workingDay: string;
}

export class DoctorShiftGroupResponseDto {
  @ApiProperty()
  groupIndex: number;

  @ApiProperty({ type: DoctorShiftResponseDto })
  representativeShift: DoctorShiftResponseDto;

  @ApiProperty()
  facilityId: string;

  @ApiPropertyOptional({ nullable: true })
  staffId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  doctorId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  roleId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  roomId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  slotId?: string | null;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiPropertyOptional({ nullable: true })
  maxAppointments?: number | null;

  @ApiProperty({ enum: DoctorShiftStatus })
  status: DoctorShiftStatus;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ nullable: true })
  staffName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  doctorName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  doctorTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  doctorSpecialty?: string | null;

  @ApiPropertyOptional({ nullable: true })
  roleName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  facilityCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  facilityName?: string | null;

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

  @ApiProperty({ type: [String], example: ['2026-08-10', '2026-08-12'] })
  dates: string[];

  @ApiProperty({ type: [String], example: ['MON', 'WED'] })
  workingDays: string[];

  @ApiProperty({ type: [String] })
  shiftIds: string[];

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
