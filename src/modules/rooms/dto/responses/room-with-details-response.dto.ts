import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../../common/constants/status.enum';

export class RoomWithDetailsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  roomType: string;

  @ApiPropertyOptional({ nullable: true })
  floor?: string | null;

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
  facilityDistrict?: string;
}
