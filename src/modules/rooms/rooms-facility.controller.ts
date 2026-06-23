import { Body, Controller, Delete, Get, HttpException, InternalServerErrorException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { RoomResponseDto } from './dto/responds/room-response.dto';

@ApiTags('Management - Rooms')
@ApiBearerAuth()
//@UseGuards(JwtAuthGuard)
@Controller('management/facility/')

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
  @ApiResponse({ status : 200, description: 'Rooms found', type: RoomResponseDto })
  async findRoomsByFacility(@Param('facilityId') id: string) {
    try {
      const rooms = await this.roomsService.findByFacilityId(id);
      return {
        message: 'Lấy danh sách phòng theo cơ sở thành công',
        data: rooms,
      };
    } catch (error) {
      this.handleError(error);
    }
  }


}
