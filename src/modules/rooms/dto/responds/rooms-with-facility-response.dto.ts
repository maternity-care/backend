import { ApiProperty } from '@nestjs/swagger';
import { FacilityResponseDto } from '../../../facilities/dto/responds/facilities-respond';
import { RoomResponseDto } from './room-response.dto';

export class RoomsWithFacilityResponseDto {
  @ApiProperty({ type: FacilityResponseDto })
  facility: FacilityResponseDto;

  @ApiProperty({ type: [RoomResponseDto] })
  rooms: RoomResponseDto[];
}
