import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, FacilityOperatingStatus, FacilityStatus, InactiveSource } from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';

export class FacilityOperatingHourResponseDto {
  @ApiProperty()
  dayOfWeek: string;

  @ApiPropertyOptional()
  openTime: string | null;

  @ApiPropertyOptional()
  closeTime: string | null;

  @ApiProperty()
  isClosed: boolean;
}

export class FacilityOperatingHourGroupResponseDto {
  @ApiProperty({ type: [String] })
  days: string[];

  @ApiProperty()
  dayLabel: string;

  @ApiPropertyOptional()
  openTime: string | null;

  @ApiPropertyOptional()
  closeTime: string | null;

  @ApiProperty()
  isClosed: boolean;

  @ApiProperty()
  displayTime: string;
}

export class FacilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  ownerId: string;

  @ApiPropertyOptional()
  ownerName?: string;

  @ApiPropertyOptional()
  ownerEmail?: string;

  @ApiPropertyOptional()
  ownerPhone?: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional({ nullable: true })
  province: string | null;

  @ApiPropertyOptional({ nullable: true })
  ward: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, default: 1 })
  floorCount: number | null;

  @ApiProperty()
  latitude: string;

  @ApiProperty()
  longitude: string;

  @ApiProperty({ enum: FacilityStatus })
  status: FacilityStatus;

  @ApiPropertyOptional({ nullable: true })
  inactiveFrom?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  inactiveUntil?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  inactiveReason?: string | null;

  @ApiPropertyOptional({ enum: InactiveSource, nullable: true })
  inactiveSource?: InactiveSource | null;

  @ApiPropertyOptional({ nullable: true })
  inactiveBy?: string | null;

  @ApiPropertyOptional({ nullable: true })
  reactivatedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  reactivatedBy?: string | null;

  @ApiPropertyOptional({ enum: FacilityOperatingStatus })
  operatingStatus?: FacilityOperatingStatus;

  @ApiPropertyOptional()
  operatingStatusLabel?: string;

  @ApiPropertyOptional()
  isOpenNow?: boolean;

  @ApiPropertyOptional({ type: FacilityOperatingHourResponseDto })
  todayOperatingHour?: FacilityOperatingHourResponseDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [FacilityOperatingHourResponseDto] })
  operatingHours?: FacilityOperatingHourResponseDto[];

  @ApiPropertyOptional({ type: [FacilityOperatingHourGroupResponseDto] })
  operatingHourGroups?: FacilityOperatingHourGroupResponseDto[];
}

export class FacilityPaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [FacilityResponseDto] })
  items: FacilityResponseDto[];
}

export class FacilityAdminOptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  personalEmail?: string | null;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  employeeCode: string;

  @ApiProperty({ enum: AccountStatus })
  status: AccountStatus;

  @ApiPropertyOptional({
    description: 'Cơ sở đang gắn trực tiếp trên staff.facility_id, nếu có',
    nullable: true,
  })
  homeFacilityId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  homeFacilityName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  homeFacilityCode?: string | null;

  @ApiProperty()
  roleId: string;

  @ApiProperty()
  roleName: string;

  @ApiProperty({
    description: 'Số cơ sở đang dùng staff này làm owner/admin phụ trách',
    example: 0,
  })
  ownedFacilityCount: number;
}

export class FacilityAdminOptionsPaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [FacilityAdminOptionResponseDto] })
  items: FacilityAdminOptionResponseDto[];
}
