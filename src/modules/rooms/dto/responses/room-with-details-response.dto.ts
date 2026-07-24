import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus, FacilityStatus } from '../../../../common/constants/status.enum';

export class RoomWithDetailsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  roomTypeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  floor: string;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  facilityCode?: string;

  @ApiPropertyOptional()
  facilityName?: string;

  @ApiPropertyOptional()
  facilityAddress?: string;

  @ApiPropertyOptional()
  facilityProvince?: string;

  @ApiPropertyOptional()
  facilityWard?: string;

  @ApiPropertyOptional({ enum: FacilityStatus })
  facilityStatus?: FacilityStatus;

  @ApiPropertyOptional()
  roomTypeName?: string;

  @ApiPropertyOptional()
  roomTypeDescription?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  roomTypeStatus?: ActiveStatus;
}

export class RoomLookupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  facilityId: string;

  @ApiPropertyOptional()
  facilityName?: string;

  @ApiProperty()
  roomTypeId: string;

  @ApiPropertyOptional()
  roomTypeName?: string;

  @ApiProperty()
  floor: string;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;
}

export class RoomTypeLookupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;
}

export class RoomTypeResponseDto extends RoomTypeLookupResponseDto {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
