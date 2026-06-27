import { Controller, Get, HttpException, InternalServerErrorException, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { RoomResponseDto } from './dto/responds/room-response.dto';
import { SearchRooms2Dto } from './dto/requests/search-room-2';

@ApiTags('Management - Rooms')
@ApiBearerAuth()
//@UseGuards(JwtAuthGuard)
@Controller('management/facility')

export class RoomsFacilityController {
  constructor(private readonly roomsService: RoomsService) {}

  private handleError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new InternalServerErrorException('Internal server error');
  }


  @Get('rooms/:facilityId')
  @ApiOperation({ summary: 'Get rooms by facility'})
  @ApiResponse({ status : 200, description: 'Rooms found', type: [RoomResponseDto] })
  async findRoomsByFacility(@Param('facilityId') facilityId: string, 
  // không cho facilityId optional vào đây vì facility bắt buộc
  @Query() filters: SearchRooms2Dto  ) {
    try {
      const rooms = await this.roomsService.findByFacilityId(facilityId, filters);
      return {
        message: 'Lấy danh sách phòng theo cơ sở thành công',
        data: rooms,
      };
    } catch (error) {
      this.handleError(error);
    }
  }


}
