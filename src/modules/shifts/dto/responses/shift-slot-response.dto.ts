import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class ShiftSlotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiPropertyOptional()
  facilityName?: string;

  @ApiPropertyOptional()
  facilityCode?: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  isOvernight: boolean;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

}

export class ShiftSlotLookupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;

}
