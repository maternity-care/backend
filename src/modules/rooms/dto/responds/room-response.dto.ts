import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomResponseDto {
  @ApiProperty()
  id: string;

  // @ApiProperty()
  // facilityId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  roomType: string;

  @ApiPropertyOptional()
  floor?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
