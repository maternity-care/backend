import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomsFacilitiesResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;


}