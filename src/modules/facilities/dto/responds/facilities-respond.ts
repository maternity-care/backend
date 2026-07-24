import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityStatus } from '../../../../common/constants/status.enum';

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
  openTime: string;

  @ApiProperty()
  closeTime: string;

  @ApiProperty()
  workingDays: string;

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

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
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
