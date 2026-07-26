import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus, FacilityStatus } from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';

export class RoomWithDetailsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  code: string;

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
  roomTypeCode?: string;

  @ApiPropertyOptional()
  roomTypeDescription?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  roomTypeStatus?: ActiveStatus;
}

export class RoomLookupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

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
  code: string;

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

export class FacilityRoomTypeResponseDto extends RoomTypeLookupResponseDto {
  @ApiProperty({ description: 'So phong dang hoat dong cua co so thuoc loai phong nay' })
  roomCount: number;
}

export class RoomPaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [RoomWithDetailsResponseDto] })
  items: RoomWithDetailsResponseDto[];
}

export class RoomTypePaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [RoomTypeResponseDto] })
  items: RoomTypeResponseDto[];
}
