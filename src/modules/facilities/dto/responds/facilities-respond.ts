import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityOperatingStatus, FacilityStatus } from '../../../../common/constants/status.enum';
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

export class FacilityClosureDayResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  closureDate: string;

  @ApiPropertyOptional()
  reason: string | null;

  @ApiProperty()
  status: string;
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

  @ApiProperty()
  province: string;

  @ApiProperty()
  ward: string;

  @ApiProperty()
  latitude: string;

  @ApiProperty()
  longitude: string;

  @ApiProperty({ enum: FacilityStatus })
  status: FacilityStatus;

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

  @ApiPropertyOptional({ type: [FacilityClosureDayResponseDto] })
  closureDays?: FacilityClosureDayResponseDto[];
}

export class FacilityLookupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  ward: string;

  @ApiProperty({ enum: FacilityStatus })
  status: FacilityStatus;

  @ApiPropertyOptional()
  ownerName?: string;
}

export class FacilityPaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [FacilityResponseDto] })
  items: FacilityResponseDto[];
}
