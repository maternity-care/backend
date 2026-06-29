import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class RoomResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  roomType: string;

  @ApiPropertyOptional()
  floor?: string;

  @ApiProperty()
  status: ActiveStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
