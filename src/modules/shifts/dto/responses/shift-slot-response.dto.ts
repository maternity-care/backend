import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { PaginationMetaResponseDto } from '../../../../common/dto/pagination-response.dto';

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

  @ApiPropertyOptional({ type: [String], example: ['MON', 'TUE', 'WED', 'THU', 'FRI'] })
  applicableDays?: string[] | null;

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

  @ApiPropertyOptional({ type: [String], example: ['MON', 'TUE', 'WED', 'THU', 'FRI'] })
  applicableDays?: string[] | null;

  @ApiProperty({ enum: ActiveStatus })
  status: ActiveStatus;

}

export class ShiftSlotPaginatedResponseDto extends PaginationMetaResponseDto {
  @ApiProperty({ type: [ShiftSlotResponseDto] })
  items: ShiftSlotResponseDto[];
}
